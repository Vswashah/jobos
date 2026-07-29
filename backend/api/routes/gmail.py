import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from services import gmail_service, db_service
from services.auth_service import get_current_user_id, create_access_token, decode_access_token
from services.interview_extractor import extract_interview_details

router = APIRouter(prefix="/gmail", tags=["gmail"])

GMAIL_REFRESH_TOKEN_KEY = "gmail_refresh_token"


def _parse_iso(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


@router.get("/status")
async def gmail_status(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    token = await db_service.get_setting(db, user_id, GMAIL_REFRESH_TOKEN_KEY)
    return {"connected": token is not None}


@router.get("/authorize")
async def gmail_authorize(user_id: str = Depends(get_current_user_id)):
    # redirect_uri must be the backend's own real domain (that's what's
    # registered with Google) — Google's redirect back to /callback lands
    # there directly, not through the frontend proxy, so it doesn't carry
    # the session cookie (which is scoped to the frontend's origin since
    # that's the only origin the browser ever sees it set from). state
    # carries the user's identity through that gap instead — it's a JWT,
    # so /callback can trust it without needing the cookie.
    if not gmail_service.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured on the server")
    return RedirectResponse(gmail_service.get_authorization_url(state=create_access_token(user_id)))


@router.get("/callback")
async def gmail_callback(code: str | None = None, error: str | None = None,
                         state: str | None = None, db: AsyncSession = Depends(get_db)):
    if error:
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")
    user_id = decode_access_token(state)

    tokens = await gmail_service.exchange_code_for_tokens(code)
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google didn't return a refresh token (it only does this on first "
                "consent). Revoke JobOS access at "
                "https://myaccount.google.com/permissions and try connecting again."
            ),
        )

    await db_service.set_setting(db, user_id, GMAIL_REFRESH_TOKEN_KEY, refresh_token)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/?gmail=connected")


@router.post("/disconnect")
async def gmail_disconnect(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await db_service.delete_setting(db, user_id, GMAIL_REFRESH_TOKEN_KEY)
    return {"message": "Gmail disconnected"}


@router.post("/sync")
async def gmail_sync(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    refresh_token = await db_service.get_setting(db, user_id, GMAIL_REFRESH_TOKEN_KEY)
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Gmail is not connected yet")

    access_token = await gmail_service.refresh_access_token(refresh_token)
    messages = await gmail_service.search_candidate_messages(access_token)

    found = 0
    skipped = 0
    for msg in messages:
        details = extract_interview_details(msg["subject"], msg["from"], msg["date"], msg["body_text"])
        if not details.get("is_interview"):
            skipped += 1
            continue

        company = details.get("company") or gmail_service.guess_company_from_sender(msg["from"])
        if not company:
            skipped += 1
            continue

        job_id = await db_service.find_job_by_company(db, user_id, company)
        if not job_id:
            skipped += 1
            continue

        application_id = await db_service.find_or_create_application(db, job_id)
        interview_date = _parse_iso(details.get("interview_date"))
        round_num = details.get("round") or 1

        existing = await db_service.find_existing_interview(db, application_id, interview_date, round_num)
        if existing:
            skipped += 1
            continue

        await db_service.save_interview(
            db, application_id, round_num, details.get("format") or "other",
            interview_date, details.get("interviewer_name"),
            notes=f'Auto-detected from email: "{msg["subject"]}"',
        )
        await db_service.log_activity(db, user_id, "interview_detected", "interview", metadata={"company": company})
        found += 1

    return {"scanned": len(messages), "interviews_found": found, "skipped": skipped}
