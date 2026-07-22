"""
Integration tests for /api/profile routes.
Requires a live, migrated+seeded Postgres database (see backend/db/migrations
and backend/db/seed.py, or run via docker-compose).
"""
import uuid


def test_get_profile_structure(client):
    res = client.get("/api/profile/")
    assert res.status_code == 200
    data = res.json()
    assert "personal" in data
    assert "skills" in data
    assert "projects" in data
    assert isinstance(data["skills"], list)
    assert isinstance(data["projects"], list)


def test_list_skills_matches_profile_skills(client):
    profile = client.get("/api/profile/").json()
    skills = client.get("/api/profile/skills").json()["skills"]
    assert len(skills) == len(profile["skills"])


def test_add_and_delete_skill(client):
    unique_name = f"TestSkill-{uuid.uuid4().hex[:8]}"

    add_res = client.post("/api/profile/skills", json={"name": unique_name, "category": "language"})
    assert add_res.status_code == 200
    created = add_res.json()
    assert created["name"] == unique_name
    assert created["category"] == "language"

    listed = client.get("/api/profile/skills").json()["skills"]
    assert any(s["name"] == unique_name for s in listed)

    del_res = client.delete(f"/api/profile/skills/{created['id']}")
    assert del_res.status_code == 200

    listed_after = client.get("/api/profile/skills").json()["skills"]
    assert not any(s["name"] == unique_name for s in listed_after)


def test_add_duplicate_skill_conflicts(client):
    unique_name = f"DupSkill-{uuid.uuid4().hex[:8]}"
    first = client.post("/api/profile/skills", json={"name": unique_name})
    assert first.status_code == 200

    dup = client.post("/api/profile/skills", json={"name": unique_name})
    assert dup.status_code == 409

    client.delete(f"/api/profile/skills/{first.json()['id']}")


def test_add_duplicate_skill_case_insensitive(client):
    base = f"CaseSkill-{uuid.uuid4().hex[:8]}"
    first = client.post("/api/profile/skills", json={"name": base.lower()})
    assert first.status_code == 200

    dup = client.post("/api/profile/skills", json={"name": base.upper()})
    assert dup.status_code == 409

    client.delete(f"/api/profile/skills/{first.json()['id']}")


def test_add_skill_blank_name_rejected(client):
    res = client.post("/api/profile/skills", json={"name": "   "})
    assert res.status_code == 400


def test_delete_nonexistent_skill_404(client):
    res = client.delete(f"/api/profile/skills/{uuid.uuid4()}")
    assert res.status_code == 404


def test_add_edit_delete_project(client):
    name = f"TestProject-{uuid.uuid4().hex[:8]}"
    payload = {
        "name": name,
        "description": "A project created by tests",
        "stack": ["Python", "Testing"],
        "github_url": None,
        "live_url": None,
        "is_live": False,
        "domains": [],
        "highlights": ["did a thing"],
    }

    add_res = client.post("/api/profile/projects", json=payload)
    assert add_res.status_code == 200
    project_id = add_res.json()["id"]

    listed = client.get("/api/profile/projects").json()["projects"]
    assert any(p["name"] == name for p in listed)

    edited_payload = {**payload, "name": f"{name}-edited", "is_live": True}
    edit_res = client.patch(f"/api/profile/projects/{project_id}", json=edited_payload)
    assert edit_res.status_code == 200

    listed_after_edit = client.get("/api/profile/projects").json()["projects"]
    edited = next(p for p in listed_after_edit if p["id"] == project_id)
    assert edited["name"] == f"{name}-edited"
    assert edited["is_live"] is True

    del_res = client.delete(f"/api/profile/projects/{project_id}")
    assert del_res.status_code == 200

    listed_after_delete = client.get("/api/profile/projects").json()["projects"]
    assert not any(p["id"] == project_id for p in listed_after_delete)


def test_add_project_blank_name_rejected(client):
    res = client.post("/api/profile/projects", json={"name": "  ", "stack": []})
    assert res.status_code == 400


def test_edit_nonexistent_project_404(client):
    res = client.patch(f"/api/profile/projects/{uuid.uuid4()}", json={"name": "ghost", "stack": []})
    assert res.status_code == 404


def test_delete_nonexistent_project_404(client):
    res = client.delete(f"/api/profile/projects/{uuid.uuid4()}")
    assert res.status_code == 404
