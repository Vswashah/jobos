"""
Security hardening: signup can't take over profiles, the signing secret is
required in production, resume inputs/filenames are bounded, and rate limits
return 429. See also test_auth_api.py for the allow-listed claim path.
"""
import uuid
import pytest
from fastapi import HTTPException

from services import rate_limit
from services.auth_service import load_secret


def _seed_passwordless_profile(email: str) -> str:
    import psycopg2
    from db.database import DATABASE_URL

    user_id = str(uuid.uuid4())
    conn = psycopg2.connect(DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_profiles (id, name, email) VALUES (%s, %s, %s)",
                (user_id, "Pre-seeded", email),
            )
        conn.commit()
    finally:
        conn.close()
    return user_id


# ── signup can't claim someone else's profile ───────────────────────────

def test_signup_cannot_claim_passwordless_profile_by_default(client, monkeypatch):
    monkeypatch.delenv("CLAIMABLE_EMAILS", raising=False)
    email = f"seeded-{uuid.uuid4().hex[:10]}@example.com"
    _seed_passwordless_profile(email)

    res = client.post("/api/auth/signup", json={"name": "Attacker", "email": email, "password": "attackerpass123"})
    assert res.status_code == 409


def test_claim_allowlist_only_covers_listed_emails(client, monkeypatch):
    listed = f"listed-{uuid.uuid4().hex[:10]}@example.com"
    other = f"other-{uuid.uuid4().hex[:10]}@example.com"
    _seed_passwordless_profile(other)
    monkeypatch.setenv("CLAIMABLE_EMAILS", f"  {listed.upper()} , nobody@example.com")

    res = client.post("/api/auth/signup", json={"name": "X", "email": other, "password": "somepassword123"})
    assert res.status_code == 409


# ── signing secret ──────────────────────────────────────────────────────

@pytest.mark.parametrize("value", [None, "", "change-me", "dev-only-insecure-secret-change-me", "short"])
def test_secret_rejected_in_production(monkeypatch, value):
    monkeypatch.setenv("DEBUG", "false")
    if value is None:
        monkeypatch.delenv("SECRET_KEY", raising=False)
    else:
        monkeypatch.setenv("SECRET_KEY", value)
    with pytest.raises(RuntimeError):
        load_secret()


def test_secret_accepted_when_strong_or_in_debug(monkeypatch):
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("SECRET_KEY", "a-long-random-production-secret-value")
    assert load_secret() == "a-long-random-production-secret-value"

    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    assert load_secret()  # insecure dev fallback, only with DEBUG=true


# ── resume generation inputs ────────────────────────────────────────────

def test_safe_name_strips_path_tricks():
    from main import _safe_name

    assert _safe_name("../../etc/passwd", "Company") == "etc_passwd"
    assert _safe_name("a/b\\c", "Company") == "a_b_c"
    assert _safe_name("Vishwaa Shah", "Resume") == "Vishwaa_Shah"
    assert _safe_name("../..", "Company") == "Company"
    assert _safe_name(None, "Resume") == "Resume"
    assert len(_safe_name("x" * 500, "Company")) == 60


def test_oversized_job_description_rejected(client):
    res = client.post("/api/resumes/analyze", json={"jd_text": "x" * 20_001, "company": "Acme", "role": "Engineer"})
    assert res.status_code == 422


def test_oversized_company_rejected(client):
    res = client.post("/api/resumes/analyze", json={"jd_text": "Python", "company": "c" * 201, "role": "Engineer"})
    assert res.status_code == 422


# ── rate limits ─────────────────────────────────────────────────────────

@pytest.fixture
def limits_on(monkeypatch):
    monkeypatch.delenv("RATE_LIMIT_DISABLED", raising=False)
    rate_limit.reset()
    yield
    rate_limit.reset()


def test_limiter_blocks_after_limit_with_retry_after(limits_on):
    rate_limit.hit("t", 2, 60)
    rate_limit.hit("t", 2, 60)
    with pytest.raises(HTTPException) as exc:
        rate_limit.hit("t", 2, 60)
    assert exc.value.status_code == 429
    assert int(exc.value.headers["Retry-After"]) >= 1
    rate_limit.hit("other-key", 2, 60)  # separate keys don't interfere


def test_limiter_check_does_not_record(limits_on):
    for _ in range(5):
        rate_limit.check("only-check", 1, 60)


def test_login_locks_after_repeated_failures(client, limits_on):
    email = f"lock-{uuid.uuid4().hex[:10]}@example.com"
    # Sign up as a throwaway user, then restore the shared client's session.
    original = list(client.cookies.jar)
    try:
        assert client.post("/api/auth/signup", json={"name": "Lock", "email": email, "password": "correct-password-1"}).status_code == 200
        client.cookies.jar.clear()
        for _ in range(10):
            assert client.post("/api/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401
        res = client.post("/api/auth/login", json={"email": email, "password": "correct-password-1"})
        assert res.status_code == 429
        assert "Retry-After" in res.headers
    finally:
        client.cookies.jar.clear()
        for cookie in original:
            client.cookies.jar.set_cookie(cookie)


def test_signup_is_rate_limited_per_address(client, limits_on):
    original = list(client.cookies.jar)
    try:
        statuses = [
            client.post("/api/auth/signup", json={"name": "S", "email": f"rl-{uuid.uuid4().hex[:10]}@example.com", "password": "password-12345"}).status_code
            for _ in range(11)
        ]
        assert statuses[:10] == [200] * 10
        assert statuses[10] == 429
    finally:
        client.cookies.jar.clear()
        for cookie in original:
            client.cookies.jar.set_cookie(cookie)
