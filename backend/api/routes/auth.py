import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db
from services.auth_service import (
    hash_password, verify_password, create_access_token,
    get_current_user_id, SESSION_COOKIE_NAME,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# httpOnly + Secure + SameSite=None so the cookie survives the cross-origin
# request between the separately-hosted frontend and backend (two different
# onrender.com subdomains in production). Secure requires HTTPS, which is
# what both services run under in production; for local http development,
# SameSite=None without Secure is rejected by browsers, so we fall back to
# Lax there — same-origin-ish (both on localhost) makes Lax sufficient.
import os
IS_PRODUCTION = os.getenv("DEBUG", "false").lower() != "true"
COOKIE_KWARGS = (
    {"samesite": "none", "secure": True} if IS_PRODUCTION
    else {"samesite": "lax", "secure": False}
)


class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    university: str | None = None
    degree: str | None = None
    graduation_date: date | None = None
    visa_status: str | None = None
    phone: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _set_session_cookie(response: Response, user_id: str):
    token = create_access_token(user_id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME, value=token, httponly=True,
        max_age=30 * 24 * 60 * 60, path="/", **COOKIE_KWARGS,
    )


@router.post("/signup")
async def signup(payload: SignupIn, response: Response, db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    if not name or len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Name is required and password must be at least 8 characters")

    existing = (await db.execute(text("""
        SELECT id, password_hash, onboarding_completed FROM user_profiles WHERE LOWER(email) = LOWER(:email) AND is_deleted = FALSE
    """), {"email": payload.email})).fetchone()

    if existing:
        user_id, existing_hash, onboarding_completed = str(existing[0]), existing[1], existing[2]
        if existing_hash:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        # A profile row exists (e.g. pre-seeded demo data) but has never had
        # a password set — claim it instead of creating a duplicate account.
        await db.execute(text("""
            UPDATE user_profiles SET password_hash = :password_hash, name = :name,
                   university = :university, degree = :degree,
                   graduation_date = :graduation_date, visa_status = :visa_status,
                   phone = COALESCE(:phone, phone), updated_at = NOW()
            WHERE id = :id
        """), {
            "id": user_id, "password_hash": hash_password(payload.password), "name": name,
            "university": payload.university, "degree": payload.degree,
            "graduation_date": payload.graduation_date, "visa_status": payload.visa_status,
            "phone": payload.phone,
        })
        await db.commit()
        _set_session_cookie(response, user_id)
        return {"id": user_id, "name": name, "email": payload.email, "claimed": True, "onboarding_completed": onboarding_completed}

    user_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO user_profiles (id, name, email, password_hash, university, degree, graduation_date, visa_status, phone)
        VALUES (:id, :name, :email, :password_hash, :university, :degree, :graduation_date, :visa_status, :phone)
    """), {
        "id": user_id, "name": name, "email": payload.email,
        "password_hash": hash_password(payload.password),
        "university": payload.university, "degree": payload.degree,
        "graduation_date": payload.graduation_date, "visa_status": payload.visa_status,
        "phone": payload.phone,
    })
    await db.commit()
    _set_session_cookie(response, user_id)
    return {"id": user_id, "name": name, "email": payload.email, "claimed": False, "onboarding_completed": False}


@router.post("/login")
async def login(payload: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT id, password_hash, name, onboarding_completed FROM user_profiles
        WHERE LOWER(email) = LOWER(:email) AND is_deleted = FALSE
    """), {"email": payload.email})).fetchone()

    if not row or not row[1] or not verify_password(payload.password, row[1]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    user_id = str(row[0])
    _set_session_cookie(response, user_id)
    return {"id": user_id, "name": row[2], "onboarding_completed": row[3]}


@router.post("/logout")
async def logout(response: Response):
    # Attributes must match how the cookie was originally set (samesite,
    # secure) or some clients treat this as a distinct cookie rather than
    # a deletion of the existing one.
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", **COOKIE_KWARGS)
    return {"message": "Logged out"}


@router.get("/me")
async def me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(text("""
        SELECT id, name, email, onboarding_completed FROM user_profiles WHERE id = :id AND is_deleted = FALSE
    """), {"id": user_id})).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Session refers to a deleted account")
    return {"id": str(row[0]), "name": row[1], "email": row[2], "onboarding_completed": row[3]}
