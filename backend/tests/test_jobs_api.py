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


def test_streak_returns_expected_shape(client):
    res = client.get("/api/jobs/streak")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["current_streak"], int)
    assert isinstance(data["longest_streak"], int)
    assert isinstance(data["active_today"], bool)
    assert len(data["grid"]) == 84
    for day in data["grid"]:
        assert "date" in day
        assert isinstance(day["count"], int)
        assert day["count"] >= 0
    # grid is chronological, oldest to newest, ending today
    dates = [day["date"] for day in data["grid"]]
    assert dates == sorted(dates)
    # the longest streak within the window can never be shorter than the
    # current streak, since the current streak is itself a run within it
    assert data["longest_streak"] >= data["current_streak"]


def test_streak_reflects_todays_activity(client):
    before = client.get("/api/jobs/streak").json()

    client.post("/api/resumes/analyze", json={
        "jd_text": "Python developer with Kafka and AWS experience",
        "company": f"StreakTest-{uuid.uuid4().hex[:8]}",
        "role": "Engineer",
        "team_focus": "",
    })

    after = client.get("/api/jobs/streak").json()
    assert after["active_today"] is True
    assert after["grid"][-1]["count"] >= before["grid"][-1]["count"] + 1


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


def test_analyze_jd_does_not_crash_when_top_project_has_empty_domains(client):
    """
    Regression test: a project with domains=[] (the field default — not
    every project has one set) used to crash the whole request with
    IndexError, because main.py did
    `project.get("domains", ["fallback"])[0]` — .get()'s default only
    applies when the *key* is missing, not when the value is an empty list.
    """
    unique_name = f"EmptyDomainsProject-{uuid.uuid4().hex[:8]}"
    # Real skills extract_skills() recognizes, chosen because none of the
    # seeded demo projects (Fleet Telemetry/Trackly/Phantom/AEGIS) list them
    # in their stack. Three matches (24 points) beats Trackly's is_live bonus
    # (20 points, its only score here since its stack doesn't match either) —
    # guarantees this project scores highest and is picked.
    unmatched_skills = ["MongoDB", "Azure", "Cassandra"]

    create_res = client.post("/api/profile/projects", json={
        "name": unique_name,
        "description": "Regression test project",
        "stack": unmatched_skills,
        "domains": [],
        "highlights": [],
    })
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    try:
        analyze_res = client.post("/api/resumes/analyze", json={
            "jd_text": "Experience with MongoDB, Azure, and Cassandra required.",
            "company": "RegressionCo",
            "role": "Engineer",
            "team_focus": "",
        })
        assert analyze_res.status_code == 200
        body = analyze_res.json()
        top_project = body["recommended_projects"]["selected"][0]
        assert top_project["name"] == unique_name
    finally:
        client.delete(f"/api/profile/projects/{project_id}")
