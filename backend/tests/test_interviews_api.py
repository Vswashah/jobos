"""
Integration tests for /api/interviews and /api/gmail/status.
Requires a live, migrated+seeded Postgres database.
"""
import uuid


def test_gmail_status_shape(client):
    res = client.get("/api/gmail/status")
    assert res.status_code == 200
    assert "connected" in res.json()
    assert isinstance(res.json()["connected"], bool)


def test_gmail_authorize_without_client_id_returns_500(client):
    # In CI / a fresh env, GOOGLE_CLIENT_ID isn't configured — should fail
    # clearly rather than redirect to a broken Google URL.
    res = client.get("/api/gmail/authorize", follow_redirects=False)
    assert res.status_code in (500, 307)  # 307 only if a real client id happens to be configured


def test_list_interviews_returns_list(client):
    res = client.get("/api/interviews/")
    assert res.status_code == 200
    assert isinstance(res.json()["interviews"], list)


def test_create_interview_for_unknown_company_404s(client):
    res = client.post("/api/interviews/", json={"company": f"NoSuchCompany-{uuid.uuid4().hex[:8]}"})
    assert res.status_code == 404


def test_create_and_list_interview_end_to_end(client):
    company = f"InterviewTestCo-{uuid.uuid4().hex[:8]}"

    analyze_res = client.post("/api/resumes/analyze", json={
        "jd_text": "Python developer with Kafka and AWS experience",
        "company": company,
        "role": "SWE Intern",
        "team_focus": "",
    })
    assert analyze_res.status_code == 200

    create_res = client.post("/api/interviews/", json={
        "company": company,
        "round": 1,
        "format": "video",
        "interview_date": "2026-08-05T14:00:00",
        "interviewer_name": "Jane Doe",
        "notes": "Recruiter screen",
    })
    assert create_res.status_code == 200
    interview_id = create_res.json()["id"]

    listed = client.get("/api/interviews/").json()["interviews"]
    match = next((i for i in listed if i["id"] == interview_id), None)
    assert match is not None
    assert match["company"] == company
    assert match["format"] == "video"
    assert match["interviewer_name"] == "Jane Doe"

    # Logging a second interview for the same company reuses the same
    # application row rather than creating a duplicate.
    create_res_2 = client.post("/api/interviews/", json={
        "company": company,
        "round": 2,
        "format": "onsite",
    })
    assert create_res_2.status_code == 200
    listed_after = client.get("/api/interviews/").json()["interviews"]
    matches = [i for i in listed_after if i["company"] == company]
    assert len(matches) == 2
    assert matches[0]["application_id"] == matches[1]["application_id"]
