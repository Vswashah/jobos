"""
Gmail integration — OAuth2 (manual code flow via httpx, no google-auth
dependency needed) plus a read-only search for likely interview emails.
"""
import base64
import os
import httpx

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

# Candidate subjects/phrases for a first-pass filter — cheap and precise
# enough to avoid scanning the whole inbox; the LLM does the real judgment
# call on whatever this turns up.
SEARCH_QUERY_TEMPLATE = (
    'newer_than:{days}d '
    '(subject:interview OR subject:"phone screen" OR subject:"technical screen" '
    'OR subject:"next steps" OR subject:"schedule a call" OR "scheduled interview" '
    'OR "invite you to interview")'
)


def get_authorization_url(state: str = "") -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GMAIL_READONLY_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return str(httpx.URL(AUTH_URL, params=params))


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()["access_token"]


async def search_candidate_messages(access_token: str, days: int = 60, max_results: int = 25) -> list:
    """Search Gmail for likely interview-related emails, return parsed message dicts."""
    headers = {"Authorization": f"Bearer {access_token}"}
    query = SEARCH_QUERY_TEMPLATE.format(days=days)

    async with httpx.AsyncClient(timeout=30) as client:
        list_resp = await client.get(
            f"{GMAIL_API_BASE}/messages",
            headers=headers,
            params={"q": query, "maxResults": max_results},
        )
        list_resp.raise_for_status()
        message_ids = [m["id"] for m in list_resp.json().get("messages", [])]

        messages = []
        for mid in message_ids:
            msg_resp = await client.get(
                f"{GMAIL_API_BASE}/messages/{mid}",
                headers=headers,
                params={"format": "full"},
            )
            msg_resp.raise_for_status()
            messages.append(parse_message(msg_resp.json()))
        return messages


def parse_message(raw: dict) -> dict:
    payload = raw.get("payload", {})
    headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
    return {
        "id": raw["id"],
        "subject": headers.get("subject", ""),
        "from": headers.get("from", ""),
        "date": headers.get("date", ""),
        # Cap body length — this goes straight into an LLM prompt.
        "body_text": extract_body_text(payload)[:4000],
    }


def extract_body_text(payload: dict) -> str:
    if payload.get("mimeType") == "text/plain" and "data" in payload.get("body", {}):
        return _b64_decode(payload["body"]["data"])
    for part in payload.get("parts", []) or []:
        if part.get("mimeType") == "text/plain" and "data" in part.get("body", {}):
            return _b64_decode(part["body"]["data"])
    for part in payload.get("parts", []) or []:
        text = extract_body_text(part)
        if text:
            return text
    return ""


def guess_company_from_sender(sender: str) -> str | None:
    """Fallback if the LLM can't name a company: derive one from the sender's email domain."""
    if "@" not in sender:
        return None
    domain = sender.split("@")[-1].strip(">").split(".")[0]
    generic = {"gmail", "outlook", "yahoo", "greenhouse", "lever", "workday", "myworkday", "smartrecruiters"}
    if not domain or domain.lower() in generic:
        return None
    return domain.capitalize()


def _b64_decode(data: str) -> str:
    padded = data.replace("-", "+").replace("_", "/")
    padded += "=" * (-len(padded) % 4)
    return base64.b64decode(padded).decode("utf-8", errors="ignore")
