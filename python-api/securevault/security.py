import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

_password_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)


def required_secret(name: str) -> str:
    value = os.getenv(name, "")
    if len(value) < 32 or value.startswith("generate-"):
        raise RuntimeError(f"{name} must be configured with a random value of at least 32 characters")
    return value


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        return _password_hasher.verify(encoded, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def issue_access_token(user: User, *, token_use: str = "access", minutes: int = 60) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "role": user.role,
        "token_use": token_use,
        "iss": os.getenv("JWT_ISSUER", "securevault-api"),
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
        "jti": secrets.token_urlsafe(12),
    }
    return jwt.encode(payload, required_secret("JWT_SECRET"), algorithm="HS256")


def decode_access_token(token: str, *, expected_use: str = "access") -> dict:
    try:
        payload = jwt.decode(
            token,
            required_secret("JWT_SECRET"),
            algorithms=["HS256"],
            issuer=os.getenv("JWT_ISSUER", "securevault-api"),
            options={"require": ["sub", "exp", "iat", "iss", "token_use"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token") from exc
    if payload.get("token_use") != expected_use:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token purpose")
    return payload


def _key(name: str) -> bytes:
    return hashlib.sha256(required_secret(name).encode("utf-8")).digest()


def encrypt_text(value: str, key_name: str) -> str:
    nonce = os.urandom(12)
    ciphertext = AESGCM(_key(key_name)).encrypt(nonce, value.encode("utf-8"), None)
    return "v1." + base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_text(value: str, key_name: str) -> str:
    version, encoded = value.split(".", 1)
    if version != "v1":
        raise ValueError("Unsupported encrypted value version")
    raw = base64.urlsafe_b64decode(encoded.encode("ascii"))
    return AESGCM(_key(key_name)).decrypt(raw[:12], raw[12:], None).decode("utf-8")


def encrypt_bytes(value: bytes, key_name: str) -> bytes:
    nonce = os.urandom(12)
    return nonce + AESGCM(_key(key_name)).encrypt(nonce, value, None)


def decrypt_bytes(value: bytes, key_name: str) -> bytes:
    return AESGCM(_key(key_name)).decrypt(value[:12], value[12:], None)


def encode_record_payload(payload: dict) -> bytes:
    return encrypt_bytes(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"), "RECORD_ENCRYPTION_KEY")


def decode_record_payload(value: bytes) -> dict:
    return json.loads(decrypt_bytes(value, "RECORD_ENCRYPTION_KEY").decode("utf-8"))


def new_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    if len(code) != 6 or not code.isdigit():
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def create_oauth_state() -> tuple[str, str, str, str]:
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
    nonce = secrets.token_urlsafe(24)
    return state, verifier, challenge, nonce


def state_cookie_serializer():
    from itsdangerous import URLSafeTimedSerializer

    return URLSafeTimedSerializer(required_secret("OAUTH_STATE_KEY"), salt="securevault-google-oauth-state")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    payload = decode_access_token(credentials.credentials)
    user = db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
    request.state.user = user
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user
