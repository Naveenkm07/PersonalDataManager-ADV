import os
import tempfile
from urllib.parse import parse_qs, urlparse

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

os.environ.update({
    "JWT_SECRET": "test-jwt-secret-with-at-least-32-characters-long",
    "MFA_ENCRYPTION_KEY": "test-mfa-key-with-at-least-32-characters-long",
    "RECORD_ENCRYPTION_KEY": "test-record-key-with-at-least-32-characters-long",
    "OAUTH_STATE_KEY": "test-oauth-state-key-at-least-32-chars-long",
    "JWT_ISSUER": "securevault-test",
    "FRONTEND_ORIGIN": "http://localhost:3000",
})

from securevault.main import create_app
from securevault.models import OAuthState, PersonalRecord
from securevault.security import create_oauth_state, decrypt_bytes, decrypt_text, encrypt_bytes


@pytest.fixture
def client():
    with tempfile.TemporaryDirectory() as directory:
        database = f"sqlite:///{directory}/test.db"
        app = create_app(database)
        with TestClient(app) as test_client:
            yield test_client


def register(client: TestClient, email: str) -> tuple[dict, str]:
    response = client.post("/api/auth/register", json={"email": email, "username": email.split("@")[0], "password": "Very-Strong-Test-Passphrase-123!"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body, body["token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_password_auth_mfa_and_role_guard(client: TestClient, monkeypatch):
    account, token = register(client, "mfa@example.com")
    assert account["user"]["role"] == "user"
    assert client.get("/api/security/audit", headers=bearer(token)).status_code == 403

    setup = client.post("/api/security/mfa/setup", headers=bearer(token))
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()
    assert client.post("/api/security/mfa/enable", headers=bearer(token), json={"code": code}).status_code == 200

    payload = {"email": "mfa@example.com", "password": "Very-Strong-Test-Passphrase-123!"}
    assert client.post("/api/auth/login", json=payload).json() == {"mfaRequired": True}
    assert client.post("/api/auth/login", json={**payload, "otp": "000000"}).status_code == 401
    login = client.post("/api/auth/login", json={**payload, "otp": pyotp.TOTP(secret).now()})
    assert login.status_code == 200
    assert login.json()["user"]["mfaEnabled"] is True
    monkeypatch.setenv("SECURITY_ADMIN_USER_IDS", account["user"]["id"])
    admin_login = client.post("/api/auth/login", json={**payload, "otp": pyotp.TOTP(secret).now()})
    assert admin_login.json()["user"]["role"] == "admin"
    assert client.get("/api/security/audit", headers=bearer(admin_login.json()["token"])).status_code == 200


def test_record_access_is_owner_scoped_searchable_and_encrypted(client: TestClient):
    _, alice_token = register(client, "alice@example.com")
    _, bob_token = register(client, "bob@example.com")
    create = client.post("/api/records", headers=bearer(alice_token), json={
        "title": "Bank login", "category": "credential", "data": {"username": "alice", "password": "vault-secret-987"}
    })
    assert create.status_code == 201
    record = create.json()
    assert record["data"]["password"] == "vault-secret-987"
    assert client.get("/api/records/search?q=secret", headers=bearer(alice_token)).json()[0]["id"] == record["id"]
    assert client.get(f"/api/records/{record['id']}", headers=bearer(bob_token)).status_code == 404

    db = client.app.state.session_factory()
    try:
        stored = db.scalar(select(PersonalRecord).where(PersonalRecord.id == record["id"]))
        assert b"vault-secret-987" not in stored.payload_ciphertext
        assert decrypt_bytes(stored.payload_ciphertext, "RECORD_ENCRYPTION_KEY")
    finally:
        db.close()


def test_oauth_authorization_uses_state_pkce_nonce_and_one_time_state(client: TestClient):
    os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
    os.environ["GOOGLE_CLIENT_SECRET"] = "test-client-secret"
    os.environ["GOOGLE_REDIRECT_URI"] = "http://localhost:8000/api/auth/oauth/google/callback"
    response = client.get("/api/auth/oauth/google/authorize", follow_redirects=False)
    assert response.status_code == 302
    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid email profile"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["state"] and query["nonce"] and query["code_challenge"]
    assert response.cookies.get("securevault_oauth_state")

    db = client.app.state.session_factory()
    try:
        state = db.get(OAuthState, query["state"][0])
        assert state is not None
        verifier = decrypt_text(state.verifier_ciphertext.decode("ascii"), "OAUTH_STATE_KEY")
        import base64
        import hashlib
        expected = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        assert query["code_challenge"] == [expected]
    finally:
        db.close()


def test_google_oauth_callback_checks_state_verifies_identity_and_issues_session(client: TestClient, monkeypatch):
    os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
    os.environ["GOOGLE_CLIENT_SECRET"] = "test-client-secret"
    os.environ["GOOGLE_REDIRECT_URI"] = "http://localhost:8000/api/auth/oauth/google/callback"
    authorization = client.get("/api/auth/oauth/google/authorize", follow_redirects=False)
    state = parse_qs(urlparse(authorization.headers["location"]).query)["state"][0]
    db = client.app.state.session_factory()
    try:
        nonce = db.get(OAuthState, state).nonce
    finally:
        db.close()

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"id_token": "test-google-id-token"}

    class FakeHttpClient:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return None
        async def post(self, *args, **kwargs): return FakeResponse()

    monkeypatch.setattr("securevault.main.httpx.AsyncClient", FakeHttpClient)
    monkeypatch.setattr("securevault.main.google_id_token.verify_oauth2_token", lambda token, request, audience: {
        "sub": "google-subject-1", "email": "oauth-user@example.com", "email_verified": True,
        "name": "OAuth User", "nonce": nonce,
    })
    callback = client.get("/api/auth/oauth/google/callback", params={"state": state, "code": "authorization-code"})
    assert callback.status_code == 200
    assert "securevault-oauth" in callback.text
    assert "oauth-user@example.com" in callback.text


def test_aes_gcm_rejects_tampering():
    ciphertext = encrypt_bytes(b"private record", "RECORD_ENCRYPTION_KEY")
    assert decrypt_bytes(ciphertext, "RECORD_ENCRYPTION_KEY") == b"private record"
    tampered = ciphertext[:-1] + bytes([ciphertext[-1] ^ 1])
    with pytest.raises(Exception):
        decrypt_bytes(tampered, "RECORD_ENCRYPTION_KEY")


def test_pkce_challenge_is_s256_of_verifier():
    import base64
    import hashlib

    _, verifier, challenge, _ = create_oauth_state()
    expected = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    assert challenge == expected
