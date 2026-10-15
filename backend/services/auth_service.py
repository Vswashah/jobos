"""
Password hashing + JWT session tokens. Stateless (no server-side session
store) — the JWT itself, signed with SECRET_KEY, is the only thing that
needs to exist; verifying it needs nothing from the database.
"""
import hashlib
import os
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Cookie, HTTPException

# Derived rather than used raw — HS256 wants >=32 bytes, and SECRET_KEY (an
# env var shared with other uses) isn't guaranteed to be that long itself.
_PLACEHOLDER_SECRETS = {"", "change-me", "dev-only-insecure-secret-change-me"}
_MIN_SECRET_LENGTH = 16


def load_secret() -> str:
    """The signing secret. Outside local development (DEBUG=true) a missing,
    placeholder or very short SECRET_KEY stops the app from starting, rather
    than silently signing sessions with a key that is public in this repo."""
    raw = os.getenv("SECRET_KEY", "")
    if os.getenv("DEBUG", "false").lower() == "true":
        return raw or "dev-only-insecure-secret-change-me"
    if raw in _PLACEHOLDER_SECRETS or len(raw) < _MIN_SECRET_LENGTH:
        raise RuntimeError(
            "SECRET_KEY is missing, a placeholder, or shorter than "
            f"{_MIN_SECRET_LENGTH} characters. Set a long random value, e.g. "
            "python -c \"import secrets; print(secrets.token_urlsafe(48))\" "
            "(or set DEBUG=true for local development only)."
        )
    return raw


_raw_secret = load_secret()
JWT_SIGNING_KEY = hashlib.sha256(_raw_secret.encode("utf-8")).digest()
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
SESSION_COOKIE_NAME = "jobos_session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SIGNING_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    """Returns the user_id encoded in the token, or raises HTTPException(401)."""
    try:
        payload = jwt.decode(token, JWT_SIGNING_KEY, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired session")


async def get_current_user_id(jobos_session: str | None = Cookie(default=None)) -> str:
    """FastAPI dependency — every authenticated route depends on this."""
    if not jobos_session:
        raise HTTPException(status_code=401, detail="Not logged in")
    return decode_access_token(jobos_session)
