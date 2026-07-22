"""
Integration tests for /api/jobs routes and the resume analysis pipeline.
Requires a live, migrated+seeded Postgres database.
"""
import uuid


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "message" in res.json()


def test_list_jobs_returns_list(client):
    res = client.get("/api/jobs/")
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data
    assert "total" in data
    assert isinstance(data["jobs"], list)
    assert data["total"] == len(data["jobs"])


def test_analytics_returns_stats_keys(client):
    res = client.get("/api/jobs/analytics")
    assert res.status_code == 200
    data = res.json()
    stats = data["stats"]
    for key in ["total_analyzed", "applied", "interviewing", "offered", "rejected", "resumes_generated"]:
        assert key in stats
    assert "recent_activity" in data


def test_analyze_jd_creates_job_and_status_can_be_updated(client):
    unique_company = f"TestCo-{uuid.uuid4().hex[:8]}"
    jd_text = "We need a Python developer with experience in Kafka, Redis, AWS, and Docker."

    analyze_res = client.post("/api/resumes/analyze", json={
        "jd_text": jd_text,
        "company": unique_company,
        "role": "Software Engineer Intern",
        "team_focus": "",
    })
    assert analyze_res.status_code == 200
    body = analyze_res.json()
    assert "extracted_skills" in body
    assert "skill_match" in body
    assert "recommended_projects" in body
    assert "python" in body["extracted_skills"]["all_skills"]

    jobs = client.get("/api/jobs/").json()["jobs"]
    matching = [j for j in jobs if j["company"] == unique_company]
    assert len(matching) == 1
    job = matching[0]
    assert job["status"] == "found"
    assert job["applied_at"] is None

    patch_res = client.patch(f"/api/jobs/{job['id']}/status?status=applied")
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "applied"

    jobs_after = client.get("/api/jobs/").json()["jobs"]
    updated = next(j for j in jobs_after if j["id"] == job["id"])
    assert updated["status"] == "applied"
    assert updated["applied_at"] is not None


def test_analyze_jd_requires_text_field(client):
    res = client.post("/api/resumes/analyze", json={"company": "NoText Co"})
    assert res.status_code == 422
