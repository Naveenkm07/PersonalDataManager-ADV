from __future__ import annotations

import asyncio
import hashlib
import html
import json
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
import pyotp
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from itsdangerous import BadSignature, SignatureExpired
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, build_engine, build_session_factory, get_db
from .models import AuditEvent, OAuthState, PersonalRecord, User, utcnow
from .schemas import LoginRequest, MfaCodeRequest, MfaDisableRequest, OAuthMfaCompleteRequest, RecordInput, RegisterRequest
from .security import (
    create_oauth_state,
    decode_access_token,
    decode_record_payload,
    decrypt_text,
    encrypt_text,
    encode_record_payload,
    get_current_user,
    hash_password,
    issue_access_token,
    new_totp_secret,
    required_secret,
    state_cookie_serializer,
    verify_password,
    verify_totp,
)

load_dotenv()

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = "openid email profile"
STATE_COOKIE = "securevault_oauth_state"


class SlidingWindowLimiter:
    """Small per-process limiter; use a shared gateway for multi-instance deployments."""

    def __init__(self):
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: tuple[str, str], *, maximum: int = 10, seconds: int = 900) -> None:
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            while events and now - events[0] >= seconds:
                events.popleft()
            if len(events) >= maximum:
                raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
            events.append(now)


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def audit(db: Session, *, action: str, user_id: str | None, success: bool, ip: str | None) -> None:
    db.add(AuditEvent(user_id=user_id, action=action, success=success, ip_address=ip))
    db.commit()


def role_for(user: User) -> str:
    configured = {item.strip() for item in os.getenv("SECURITY_ADMIN_USER_IDS", "").split(",") if item.strip()}
    return "admin" if user.role == "admin" or user.id in configured else "user"


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "_id": user.id,
        "name": user.name,
        "username": user.name,
        "email": user.email,
        "role": role_for(user),
        "mfaEnabled": user.mfa_enabled,
    }


def app_origin(request: Request) -> str:
    return os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")


def _js_json(value: dict) -> str:
    return json.dumps(value, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def popup_result_page(request: Request, session: dict | None = None, *, message: str = "") -> HTMLResponse:
    target = json.dumps(app_origin(request))
    if session is not None:
        payload = _js_json({"type": "securevault-oauth", "session": session})
        body = f"""<!doctype html><meta charset="utf-8"><title>SecureVault sign-in</title>
        <p>Google sign-in completed. You can close this window.</p>
        <script>if(window.opener){{window.opener.postMessage({payload},{target});window.close();}}</script>"""
    else:
        body = f"<!doctype html><meta charset='utf-8'><title>SecureVault sign-in</title><p>{html.escape(message)}</p>"
    return HTMLResponse(body, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


def oauth_mfa_page(request: Request, challenge_token: str) -> HTMLResponse:
    api_origin = json.dumps(str(request.base_url).rstrip("/"))
    target = json.dumps(app_origin(request))
    challenge = json.dumps(challenge_token)
    body = f"""<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer">
    <title>Verify SecureVault MFA</title><main style="font:16px sans-serif;max-width:26rem;margin:3rem auto">
    <h1>Verify your authenticator</h1><p>Enter the current six-digit code to finish Google sign-in.</p>
    <form id="verify"><label>Authenticator code <input name="code" inputmode="numeric" pattern="[0-9]{{6}}" maxlength="6" required></label>
    <button>Verify</button></form><p id="error" role="alert"></p></main>
    <script>
    const api={api_origin}, target={target}, challenge={challenge};
    document.getElementById('verify').addEventListener('submit',async e=>{{e.preventDefault();
      const code=new FormData(e.currentTarget).get('code');
      const response=await fetch(api+'/api/auth/oauth/google/complete',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{challenge_token:challenge,code}})}});
      const data=await response.json();
      if(!response.ok){{document.getElementById('error').textContent=data.detail||'Verification failed';return;}}
      if(window.opener){{window.opener.postMessage({{type:'securevault-oauth',session:data}},target);window.close();}}
    }});
    </script>"""
    return HTMLResponse(body, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


def create_app(database_url: str | None = None) -> FastAPI:
    engine = build_engine(database_url)
    session_factory = build_session_factory(engine)
    app = FastAPI(title="SecureVault API", version="1.0.0")
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.rate_limiter = SlidingWindowLimiter()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.on_event("startup")
    def create_schema() -> None:
        if os.getenv("APP_ENV", "development") == "production":
            for key in ("JWT_SECRET", "MFA_ENCRYPTION_KEY", "RECORD_ENCRYPTION_KEY", "OAUTH_STATE_KEY"):
                required_secret(key)
        Base.metadata.create_all(bind=engine)

    @app.on_event("shutdown")
    def dispose_engine() -> None:
        engine.dispose()

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": "securevault-python-api"}

    @app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
    def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> dict:
        app.state.rate_limiter.check((client_ip(request) or "unknown", "register"))
        email = str(body.email).lower()
        if db.scalar(select(User).where(User.email == email)):
            raise HTTPException(status_code=409, detail="Email already registered")
        user = User(email=email, name=body.username.strip(), password_hash=hash_password(body.password), role="user")
        db.add(user)
        db.commit()
        db.refresh(user)
        audit(db, action="register_success", user_id=user.id, success=True, ip=client_ip(request))
        return {"token": issue_access_token(user), "user": public_user(user)}

    @app.post("/api/auth/login")
    def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict:
        app.state.rate_limiter.check((client_ip(request) or "unknown", "login"))
        user = db.scalar(select(User).where(User.email == str(body.email).lower()))
        if user is None or not verify_password(body.password, user.password_hash):
            audit(db, action="login_failed", user_id=user.id if user else None, success=False, ip=client_ip(request))
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if user.mfa_enabled and body.otp is None:
            return {"mfaRequired": True}
        if user.mfa_enabled:
            try:
                secret = decrypt_text(user.mfa_secret_ciphertext or "", "MFA_ENCRYPTION_KEY")
            except Exception as exc:
                raise HTTPException(status_code=503, detail="MFA is temporarily unavailable") from exc
            if not verify_totp(secret, body.otp or ""):
                audit(db, action="mfa_login_failed", user_id=user.id, success=False, ip=client_ip(request))
                raise HTTPException(status_code=401, detail="Invalid credentials or verification code")
        audit(db, action="login_success", user_id=user.id, success=True, ip=client_ip(request))
        token_user = User(id=user.id, email=user.email, name=user.name, role=role_for(user), mfa_enabled=user.mfa_enabled)
        return {"token": issue_access_token(token_user), "user": public_user(token_user)}

    @app.get("/api/auth/me")
    def me(user: User = Depends(get_current_user)) -> dict:
        result = public_user(user)
        return result

    @app.post("/api/auth/logout")
    def logout(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        audit(db, action="logout", user_id=user.id, success=True, ip=client_ip(request))
        return {"message": "Logged out"}

    @app.get("/api/security/status")
    def security_status(user: User = Depends(get_current_user)) -> dict:
        return {"mfaEnabled": user.mfa_enabled, "role": role_for(user)}

    @app.post("/api/security/mfa/setup")
    def mfa_setup(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        if user.mfa_enabled:
            raise HTTPException(status_code=409, detail="MFA is already enabled")
        secret = new_totp_secret()
        user.mfa_pending_secret_ciphertext = encrypt_text(secret, "MFA_ENCRYPTION_KEY")
        db.commit()
        audit(db, action="mfa_setup_started", user_id=user.id, success=True, ip=client_ip(request))
        label = f"SecureVault:{user.email}"
        url = pyotp.TOTP(secret).provisioning_uri(name=label, issuer_name="SecureVault")
        return {"secret": secret, "otpauthUrl": url}

    @app.post("/api/security/mfa/enable")
    def mfa_enable(body: MfaCodeRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        if not user.mfa_pending_secret_ciphertext:
            raise HTTPException(status_code=409, detail="Start MFA setup first")
        secret = decrypt_text(user.mfa_pending_secret_ciphertext, "MFA_ENCRYPTION_KEY")
        if not verify_totp(secret, body.code):
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        user.mfa_secret_ciphertext = user.mfa_pending_secret_ciphertext
        user.mfa_pending_secret_ciphertext = None
        user.mfa_enabled = True
        db.commit()
        audit(db, action="mfa_enabled", user_id=user.id, success=True, ip=client_ip(request))
        return {"mfaEnabled": True}

    @app.post("/api/security/mfa/disable")
    def mfa_disable(body: MfaDisableRequest, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        if not user.mfa_enabled or not user.mfa_secret_ciphertext:
            raise HTTPException(status_code=409, detail="MFA is not enabled")
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials or verification code")
        secret = decrypt_text(user.mfa_secret_ciphertext, "MFA_ENCRYPTION_KEY")
        if not verify_totp(secret, body.code):
            raise HTTPException(status_code=401, detail="Invalid credentials or verification code")
        user.mfa_enabled = False
        user.mfa_secret_ciphertext = None
        db.commit()
        audit(db, action="mfa_disabled", user_id=user.id, success=True, ip=client_ip(request))
        return {"mfaEnabled": False}

    @app.get("/api/security/audit")
    def audit_log(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
        if role_for(user) != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        events = db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(500)).all()
        return [{"id": event.id, "userId": event.user_id, "action": event.action, "success": event.success, "ipAddress": event.ip_address, "timestamp": event.created_at.isoformat()} for event in events]

    @app.get("/api/records/search")
    def search_records(q: str = Query(min_length=1, max_length=120), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
        return list_owned_records(db, user, q=q)

    @app.get("/api/records")
    def list_records(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
        return list_owned_records(db, user)

    @app.post("/api/records", status_code=status.HTTP_201_CREATED)
    def create_record(body: RecordInput, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        record = PersonalRecord(owner_id=user.id, title=body.title.strip(), category=body.category, payload_ciphertext=encode_record_payload(body.data))
        db.add(record)
        db.commit()
        db.refresh(record)
        audit(db, action="record_create", user_id=user.id, success=True, ip=client_ip(request))
        return record_output(record)

    @app.get("/api/records/{record_id}")
    def read_record(record_id: str, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        record = owned_record(db, user, record_id)
        audit(db, action="record_read", user_id=user.id, success=True, ip=client_ip(request))
        return record_output(record)

    @app.put("/api/records/{record_id}")
    def update_record(record_id: str, body: RecordInput, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        record = owned_record(db, user, record_id)
        record.title = body.title.strip()
        record.category = body.category
        record.payload_ciphertext = encode_record_payload(body.data)
        record.updated_at = utcnow()
        db.commit()
        audit(db, action="record_update", user_id=user.id, success=True, ip=client_ip(request))
        return record_output(record)

    @app.delete("/api/records/{record_id}")
    def delete_record(record_id: str, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
        record = owned_record(db, user, record_id)
        db.delete(record)
        db.commit()
        audit(db, action="record_delete", user_id=user.id, success=True, ip=client_ip(request))
        return {"message": "Record deleted"}

    @app.get("/api/auth/oauth/google/authorize")
    def google_authorize(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        if not client_id or not os.getenv("GOOGLE_CLIENT_SECRET") or not os.getenv("GOOGLE_REDIRECT_URI"):
            raise HTTPException(status_code=503, detail="Google OAuth is not configured")
        state, verifier, challenge, nonce = create_oauth_state()
        db.add(OAuthState(id=state, verifier_ciphertext=encrypt_text(verifier, "OAUTH_STATE_KEY").encode("ascii"), nonce=nonce, expires_at=utcnow() + timedelta(minutes=10)))
        db.commit()
        params = {
            "client_id": client_id,
            "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
            "response_type": "code",
            "scope": GOOGLE_SCOPES,
            "state": state,
            "nonce": nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        target = RedirectResponse(f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}", status_code=302)
        signed_state = state_cookie_serializer().dumps({"state": state})
        target.set_cookie(STATE_COOKIE, signed_state, max_age=600, httponly=True, secure=os.getenv("APP_ENV") == "production", samesite="lax", path="/api/auth/oauth/google/callback")
        return target

    @app.get("/api/auth/oauth/google/callback", response_class=HTMLResponse)
    async def google_callback(request: Request, state: str, code: str, db: Session = Depends(get_db)) -> HTMLResponse:
        cookie = request.cookies.get(STATE_COOKIE)
        try:
            cookie_state = state_cookie_serializer().loads(cookie or "", max_age=600).get("state")
        except (BadSignature, SignatureExpired, RuntimeError):
            cookie_state = None
        if not cookie_state or not secrets.compare_digest(cookie_state, state):
            raise HTTPException(status_code=400, detail="OAuth state validation failed")
        oauth_state = db.get(OAuthState, state)
        if oauth_state is None or oauth_state.expires_at.replace(tzinfo=timezone.utc) < utcnow():
            raise HTTPException(status_code=400, detail="OAuth request expired")
        verifier = decrypt_text(oauth_state.verifier_ciphertext.decode("ascii"), "OAUTH_STATE_KEY")
        nonce = oauth_state.nonce
        db.delete(oauth_state)
        db.commit()

        async with httpx.AsyncClient(timeout=12.0) as client:
            exchange = await client.post(GOOGLE_TOKEN_URL, data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
                "code_verifier": verifier,
            })
        if exchange.status_code != 200:
            raise HTTPException(status_code=401, detail="Google authorization failed")
        token_data = exchange.json()
        raw_id_token = token_data.get("id_token")
        if not raw_id_token:
            raise HTTPException(status_code=401, detail="Google did not return an identity token")

        def verify_google_token():
            return google_id_token.verify_oauth2_token(raw_id_token, GoogleRequest(), os.environ["GOOGLE_CLIENT_ID"])

        try:
            claims = await asyncio.to_thread(verify_google_token)
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Google identity token could not be verified") from exc
        if claims.get("nonce") != nonce or not claims.get("email_verified") or not claims.get("sub") or not claims.get("email"):
            raise HTTPException(status_code=401, detail="Google identity verification failed")
        user = db.scalar(select(User).where(User.oauth_provider == "google", User.oauth_subject == claims["sub"]))
        email = claims["email"].lower()
        if user is None:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email, name=claims.get("name") or email.split("@", 1)[0], role="user")
                db.add(user)
                db.flush()
            user.oauth_provider = "google"
            user.oauth_subject = claims["sub"]
            db.commit()
            db.refresh(user)
        audit(db, action="oauth_google_login", user_id=user.id, success=True, ip=client_ip(request))
        if user.mfa_enabled:
            challenge = issue_access_token(user, token_use="oauth_mfa", minutes=5)
            return oauth_mfa_page(request, challenge)
        token_user = User(id=user.id, email=user.email, name=user.name, role=role_for(user), mfa_enabled=False)
        return popup_result_page(request, {"token": issue_access_token(token_user), "user": public_user(token_user)})

    @app.post("/api/auth/oauth/google/complete")
    def complete_google_mfa(body: OAuthMfaCompleteRequest, request: Request, db: Session = Depends(get_db)) -> dict:
        challenge = decode_access_token(body.challenge_token, expected_use="oauth_mfa")
        user = db.get(User, challenge["sub"])
        if user is None or not user.mfa_enabled or not user.mfa_secret_ciphertext:
            raise HTTPException(status_code=401, detail="MFA challenge is no longer valid")
        secret = decrypt_text(user.mfa_secret_ciphertext, "MFA_ENCRYPTION_KEY")
        if not verify_totp(secret, body.code):
            audit(db, action="oauth_mfa_failed", user_id=user.id, success=False, ip=client_ip(request))
            raise HTTPException(status_code=401, detail="Invalid authenticator code")
        audit(db, action="oauth_mfa_success", user_id=user.id, success=True, ip=client_ip(request))
        token_user = User(id=user.id, email=user.email, name=user.name, role=role_for(user), mfa_enabled=True)
        return {"token": issue_access_token(token_user), "user": public_user(token_user)}

    return app


def owned_record(db: Session, user: User, record_id: str) -> PersonalRecord:
    record = db.scalar(select(PersonalRecord).where(PersonalRecord.id == record_id, PersonalRecord.owner_id == user.id))
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


def record_output(record: PersonalRecord) -> dict:
    return {
        "id": record.id,
        "title": record.title,
        "category": record.category,
        "data": decode_record_payload(record.payload_ciphertext),
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def list_owned_records(db: Session, user: User, q: str | None = None) -> list[dict]:
    records = db.scalars(select(PersonalRecord).where(PersonalRecord.owner_id == user.id).order_by(PersonalRecord.updated_at.desc()).limit(200)).all()
    results = []
    query = q.casefold() if q else None
    for record in records:
        data = decode_record_payload(record.payload_ciphertext)
        if query is None or query in record.title.casefold() or query in record.category.casefold() or query in json.dumps(data, ensure_ascii=False).casefold():
            result = record_output(record)
            results.append(result)
    return results


app = create_app()
