"""
Integration tests for /api/auth and — critically — cross-user data isolation
across the now-multi-user routes.

These reuse the shared session-scoped `client` fixture (see conftest.py)
rather than opening new TestClient instances: the app holds one process-wide
async engine (db/database.py), and a second TestClient spins up its own
event-loop thread, which corrupts the shared asyncpg connection pool
("another operation is in progress") — even used sequentially, not just
concurrently. `auth_client` wraps `client` and restores its original session
cookie afterward, so signing up/logging in as throwaway test users here
doesn't leave the shared client authenticated as one of them for tests in
other files that run later in the same session.
"""
import uuid
import pytest


@pytest.fixture
def auth_client(client):
    # Snapshot the *actual* http.cookiejar.Cookie objects (full domain/path/
    # attributes), not just the name/value pair — client.cookies.set(name,
    # value) reconstructs a loosely-scoped cookie that coexists alongside a
    # properly-scoped one from a real Set-Cookie response instead of
    # replacing it, which silently duplicates jobos_session and makes
    # delete_cookie's exact-match removal leave the stale duplicate behind.
    original_cookies = list(client.cookies.jar)

    def _restore():
        client.cookies.jar.clear()
        for cookie in original_cookies:
            client.cookies.jar.set_cookie(cookie)

    yield client
    _restore()


def _unique_email():
    return f"auth-test-{uuid.uuid4().hex[:10]}@example.com"


def test_signup_creates_user_and_sets_session_cookie(auth_client):
    res = auth_client.post("/api/auth/signup", json={
        "name": "New Person", "email": _unique_email(), "password": "supersecret123",
    })
    assert res.status_code == 200
    assert res.json()["claimed"] is False
    assert "jobos_session" in res.cookies

    me = auth_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["name"] == "New Person"


def test_signup_rejects_short_password(auth_client):
    res = auth_client.post("/api/auth/signup", json={
        "name": "Short Pass", "email": _unique_email(), "password": "short",
    })
    assert res.status_code == 400


def test_signup_rejects_blank_name(auth_client):
    res = auth_client.post("/api/auth/signup", json={
        "name": "   ", "email": _unique_email(), "password": "supersecret123",
    })
    assert res.status_code == 400


def test_signup_duplicate_claimed_email_conflicts(auth_client):
    email = _unique_email()
    first = auth_client.post("/api/auth/signup", json={"name": "First", "email": email, "password": "supersecret123"})
    assert first.status_code == 200

    second = auth_client.post("/api/auth/signup", json={"name": "Second", "email": email, "password": "differentpass123"})
    assert second.status_code == 409


def test_login_wrong_password_401(auth_client):
    email = _unique_email()
    auth_client.post("/api/auth/signup", json={"name": "Login Test", "email": email, "password": "correctpass123"})

    res = auth_client.post("/api/auth/login", json={"email": email, "password": "wrongpassword"})
    assert res.status_code == 401


def test_login_nonexistent_email_401(auth_client):
    res = auth_client.post("/api/auth/login", json={"email": _unique_email(), "password": "whatever123"})
    assert res.status_code == 401


def test_login_correct_password_succeeds(auth_client):
    email = _unique_email()
    auth_client.post("/api/auth/signup", json={"name": "Login Success", "email": email, "password": "correctpass123"})

    res = auth_client.post("/api/auth/login", json={"email": email, "password": "correctpass123"})
    assert res.status_code == 200
    assert auth_client.get("/api/auth/me").status_code == 200


def test_me_requires_auth(auth_client):
    auth_client.cookies.delete("jobos_session")
    res = auth_client.get("/api/auth/me")
    assert res.status_code == 401


def test_logout_clears_session(auth_client):
    auth_client.post("/api/auth/signup", json={"name": "Logout Test", "email": _unique_email(), "password": "supersecret123"})
    assert auth_client.get("/api/auth/me").status_code == 200

    auth_client.post("/api/auth/logout")
    assert auth_client.get("/api/auth/me").status_code == 401


def test_signup_claims_existing_passwordless_account(auth_client):
    """A pre-existing profile row with no password (e.g. seeded demo data)
    should be claimable by signing up with the same email, rather than
    rejected as a duplicate — and its existing data should still be there."""
    import psycopg2
    from db.database import DATABASE_URL

    email = _unique_email()
    seeded_user_id = str(uuid.uuid4())

    # A synchronous connection here — reusing the app's own async engine
    # from test code hits the same cross-event-loop asyncpg conflict as a
    # second TestClient would (see module docstring).
    sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = psycopg2.connect(sync_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO user_profiles (id, name, email) VALUES (%s, %s, %s)",
                (seeded_user_id, "Pre-seeded", email),
            )
            cur.execute(
                "INSERT INTO skills (id, user_id, name, category) VALUES (%s, %s, 'Rust', 'language')",
                (str(uuid.uuid4()), seeded_user_id),
            )
        conn.commit()
    finally:
        conn.close()

    res = auth_client.post("/api/auth/signup", json={"name": "Claimed Name", "email": email, "password": "newpassword123"})
    assert res.status_code == 200
    body = res.json()
    assert body["claimed"] is True
    assert body["id"] == seeded_user_id

    profile = auth_client.get("/api/profile/").json()
    assert any(s["name"] == "Rust" for s in profile["skills"])


def test_cross_user_data_isolation(auth_client):
    """The core security property of multi-user support: one account must
    never see another's skills, projects, or jobs. Sequential on purpose —
    User A's phase captures its results before switching identity to User B,
    rather than keeping both "live" at once (see module docstring)."""
    skill_name = f"IsolationTestSkill-{uuid.uuid4().hex[:8]}"
    company = f"IsolationTestCo-{uuid.uuid4().hex[:8]}"

    # ── User A ──────────────────────────────────────────────────────────
    auth_client.post("/api/auth/signup", json={
        "name": "User A", "email": _unique_email(), "password": "passwordA123",
    })
    add_res = auth_client.post("/api/profile/skills", json={"name": skill_name})
    assert add_res.status_code == 200
    auth_client.post("/api/resumes/analyze", json={
        "jd_text": "Python developer", "company": company, "role": "Engineer",
    })

    a_skills = auth_client.get("/api/profile/skills").json()["skills"]
    assert any(s["name"] == skill_name for s in a_skills)
    a_jobs = auth_client.get("/api/jobs/").json()["jobs"]
    assert any(j["company"] == company for j in a_jobs)

    # ── Switch to User B ────────────────────────────────────────────────
    # Clear first — leftover duplicate-attribute cookies can otherwise pile
    # up in the jar across signups within one test and get sent together.
    auth_client.cookies.clear()
    auth_client.post("/api/auth/signup", json={
        "name": "User B", "email": _unique_email(), "password": "passwordB123",
    })

    b_skills = auth_client.get("/api/profile/skills").json()["skills"]
    assert not any(s["name"] == skill_name for s in b_skills)
    b_jobs = auth_client.get("/api/jobs/").json()["jobs"]
    assert not any(j["company"] == company for j in b_jobs)

    # User B can't log an interview against User A's job by company name
    interview_res = auth_client.post("/api/interviews/", json={"company": company})
    assert interview_res.status_code == 404
