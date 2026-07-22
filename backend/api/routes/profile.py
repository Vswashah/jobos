import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db
from services.db_service import USER_ID

router = APIRouter(prefix="/profile", tags=["profile"])


class SkillIn(BaseModel):
    name: str
    category: Optional[str] = "other"
    proficiency: Optional[str] = "intermediate"


class ProjectIn(BaseModel):
    name: str
    description: Optional[str] = ""
    stack: List[str] = []
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    is_live: bool = False
    domains: List[str] = []
    highlights: List[str] = []


@router.get("/")
async def get_profile(db: AsyncSession = Depends(get_db)):
    """Full profile — personal info, skills, projects"""
    profile_row = (await db.execute(text("""
        SELECT name, email, phone, linkedin_url, github_url, portfolio_url,
               university, degree, graduation_date, visa_status
        FROM user_profiles WHERE id = :user_id AND is_deleted = FALSE
    """), {"user_id": USER_ID})).fetchone()

    skills_rows = (await db.execute(text("""
        SELECT id, name, category, proficiency FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": USER_ID})).fetchall()

    project_rows = (await db.execute(text("""
        SELECT id, name, description, stack, github_url, live_url, is_live, domains, highlights, display_order
        FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": USER_ID})).fetchall()

    personal = None
    if profile_row:
        personal = {
            "name": profile_row[0],
            "email": profile_row[1],
            "phone": profile_row[2],
            "linkedin_url": profile_row[3],
            "github_url": profile_row[4],
            "portfolio_url": profile_row[5],
            "university": profile_row[6],
            "degree": profile_row[7],
            "graduation_date": str(profile_row[8]) if profile_row[8] else None,
            "visa_status": profile_row[9],
        }

    def parse_highlights(raw):
        if isinstance(raw, str):
            raw = json.loads(raw)
        return (raw or {}).get("default", [])

    return {
        "personal": personal,
        "skills": [{"id": str(r[0]), "name": r[1], "category": r[2], "proficiency": r[3]} for r in skills_rows],
        "projects": [{
            "id": str(r[0]),
            "name": r[1],
            "description": r[2],
            "stack": r[3] or [],
            "github_url": r[4],
            "live_url": r[5],
            "is_live": r[6],
            "domains": r[7] or [],
            "highlights": parse_highlights(r[8]),
        } for r in project_rows],
    }


@router.get("/skills")
async def list_skills(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, name, category, proficiency FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": USER_ID})).fetchall()
    return {"skills": [{"id": str(r[0]), "name": r[1], "category": r[2], "proficiency": r[3]} for r in rows]}


@router.post("/skills")
async def add_skill(skill: SkillIn, db: AsyncSession = Depends(get_db)):
    name = skill.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")

    existing = (await db.execute(text("""
        SELECT id FROM skills WHERE user_id = :user_id AND is_deleted = FALSE AND LOWER(name) = LOWER(:name)
    """), {"user_id": USER_ID, "name": name})).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"'{name}' is already in your skills")

    skill_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO skills (id, user_id, name, category, proficiency, verified, source)
        VALUES (:id, :user_id, :name, :category, :proficiency, TRUE, 'manual')
    """), {
        "id": skill_id, "user_id": USER_ID, "name": name,
        "category": skill.category or "other", "proficiency": skill.proficiency or "intermediate",
    })
    await db.commit()
    return {"id": skill_id, "name": name, "category": skill.category or "other", "proficiency": skill.proficiency or "intermediate"}


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        UPDATE skills SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = :id AND user_id = :user_id
    """), {"id": skill_id, "user_id": USER_ID})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"message": "Skill removed"}


@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, name, description, stack, github_url, live_url, is_live, domains, highlights, display_order
        FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": USER_ID})).fetchall()

    def parse_highlights(raw):
        if isinstance(raw, str):
            raw = json.loads(raw)
        return (raw or {}).get("default", [])

    return {"projects": [{
        "id": str(r[0]), "name": r[1], "description": r[2], "stack": r[3] or [],
        "github_url": r[4], "live_url": r[5], "is_live": r[6], "domains": r[7] or [],
        "highlights": parse_highlights(r[8]),
    } for r in rows]}


@router.post("/projects")
async def add_project(project: ProjectIn, db: AsyncSession = Depends(get_db)):
    name = project.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    max_order = (await db.execute(text("""
        SELECT COALESCE(MAX(display_order), 0) FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
    """), {"user_id": USER_ID})).scalar()

    project_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO projects (id, user_id, name, description, stack, github_url, live_url,
                              is_live, domains, highlights, display_order)
        VALUES (:id, :user_id, :name, :description, :stack, :github_url, :live_url,
                :is_live, :domains, :highlights, :display_order)
    """), {
        "id": project_id, "user_id": USER_ID, "name": name, "description": project.description,
        "stack": project.stack, "github_url": project.github_url, "live_url": project.live_url,
        "is_live": project.is_live, "domains": project.domains,
        "highlights": json.dumps({"default": project.highlights}),
        "display_order": (max_order or 0) + 1,
    })
    await db.commit()
    return {"id": project_id, **project.model_dump()}


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectIn, db: AsyncSession = Depends(get_db)):
    name = project.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    result = await db.execute(text("""
        UPDATE projects SET name = :name, description = :description, stack = :stack,
               github_url = :github_url, live_url = :live_url, is_live = :is_live,
               domains = :domains, highlights = :highlights, updated_at = NOW()
        WHERE id = :id AND user_id = :user_id AND is_deleted = FALSE
    """), {
        "id": project_id, "user_id": USER_ID, "name": name, "description": project.description,
        "stack": project.stack, "github_url": project.github_url, "live_url": project.live_url,
        "is_live": project.is_live, "domains": project.domains,
        "highlights": json.dumps({"default": project.highlights}),
    })
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": project_id, **project.model_dump()}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        UPDATE projects SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = :id AND user_id = :user_id
    """), {"id": project_id, "user_id": USER_ID})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project removed"}
