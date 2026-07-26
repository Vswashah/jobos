import uuid
import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db
from services.auth_service import get_current_user_id

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


class EducationIn(BaseModel):
    degree: str
    school: str
    track: Optional[str] = None
    relevant_courses: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PersonalIn(BaseModel):
    name: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    university: Optional[str] = None
    degree: Optional[str] = None
    graduation_date: Optional[date] = None
    visa_status: Optional[str] = None
    job_type: Optional[str] = None
    remote_preference: Optional[str] = None
    target_roles: List[str] = []
    preferred_locations: List[str] = []


@router.get("/")
async def get_profile(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Full profile — personal info, skills, projects"""
    profile_row = (await db.execute(text("""
        SELECT name, email, phone, linkedin_url, github_url, portfolio_url,
               university, degree, graduation_date, visa_status,
               job_type, remote_preference, target_roles, preferred_locations,
               onboarding_completed
        FROM user_profiles WHERE id = :user_id AND is_deleted = FALSE
    """), {"user_id": user_id})).fetchone()

    skills_rows = (await db.execute(text("""
        SELECT id, name, category, proficiency FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": user_id})).fetchall()

    project_rows = (await db.execute(text("""
        SELECT id, name, description, stack, github_url, live_url, is_live, domains, highlights, display_order
        FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": user_id})).fetchall()

    education_rows = (await db.execute(text("""
        SELECT id, degree, school, track, relevant_courses, start_date, end_date
        FROM education WHERE user_id = :user_id
        ORDER BY display_order
    """), {"user_id": user_id})).fetchall()

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
            "job_type": profile_row[10],
            "remote_preference": profile_row[11],
            "target_roles": profile_row[12] or [],
            "preferred_locations": profile_row[13] or [],
            "onboarding_completed": profile_row[14],
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
        "education": [{
            "id": str(r[0]),
            "degree": r[1],
            "school": r[2],
            "track": r[3],
            "relevant_courses": r[4],
            "start_date": str(r[5]) if r[5] else None,
            "end_date": str(r[6]) if r[6] else None,
        } for r in education_rows],
    }


@router.patch("/")
async def update_personal(payload: PersonalIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    result = await db.execute(text("""
        UPDATE user_profiles SET name = :name, phone = :phone, linkedin_url = :linkedin_url,
               github_url = :github_url, portfolio_url = :portfolio_url, university = :university,
               degree = :degree, graduation_date = :graduation_date, visa_status = :visa_status,
               job_type = :job_type, remote_preference = :remote_preference,
               target_roles = :target_roles, preferred_locations = :preferred_locations,
               updated_at = NOW()
        WHERE id = :id AND is_deleted = FALSE
    """), {
        "id": user_id, "name": name, "phone": payload.phone,
        "linkedin_url": payload.linkedin_url, "github_url": payload.github_url,
        "portfolio_url": payload.portfolio_url, "university": payload.university,
        "degree": payload.degree, "graduation_date": payload.graduation_date,
        "visa_status": payload.visa_status, "job_type": payload.job_type,
        "remote_preference": payload.remote_preference, "target_roles": payload.target_roles,
        "preferred_locations": payload.preferred_locations,
    })
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile updated"}


@router.post("/complete-onboarding")
async def complete_onboarding(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await db.execute(text("""
        UPDATE user_profiles SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = :id
    """), {"id": user_id})
    await db.commit()
    return {"message": "Onboarding complete"}


@router.get("/skills")
async def list_skills(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, name, category, proficiency FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": user_id})).fetchall()
    return {"skills": [{"id": str(r[0]), "name": r[1], "category": r[2], "proficiency": r[3]} for r in rows]}


@router.post("/skills")
async def add_skill(skill: SkillIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    name = skill.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")

    existing = (await db.execute(text("""
        SELECT id FROM skills WHERE user_id = :user_id AND is_deleted = FALSE AND LOWER(name) = LOWER(:name)
    """), {"user_id": user_id, "name": name})).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"'{name}' is already in your skills")

    skill_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO skills (id, user_id, name, category, proficiency, verified, source)
        VALUES (:id, :user_id, :name, :category, :proficiency, TRUE, 'manual')
    """), {
        "id": skill_id, "user_id": user_id, "name": name,
        "category": skill.category or "other", "proficiency": skill.proficiency or "intermediate",
    })
    await db.commit()
    return {"id": skill_id, "name": name, "category": skill.category or "other", "proficiency": skill.proficiency or "intermediate"}


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        UPDATE skills SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = :id AND user_id = :user_id
    """), {"id": skill_id, "user_id": user_id})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"message": "Skill removed"}


@router.get("/projects")
async def list_projects(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, name, description, stack, github_url, live_url, is_live, domains, highlights, display_order
        FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": user_id})).fetchall()

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
async def add_project(project: ProjectIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    name = project.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    max_order = (await db.execute(text("""
        SELECT COALESCE(MAX(display_order), 0) FROM projects WHERE user_id = :user_id AND is_deleted = FALSE
    """), {"user_id": user_id})).scalar()

    project_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO projects (id, user_id, name, description, stack, github_url, live_url,
                              is_live, domains, highlights, display_order)
        VALUES (:id, :user_id, :name, :description, :stack, :github_url, :live_url,
                :is_live, :domains, :highlights, :display_order)
    """), {
        "id": project_id, "user_id": user_id, "name": name, "description": project.description,
        "stack": project.stack, "github_url": project.github_url, "live_url": project.live_url,
        "is_live": project.is_live, "domains": project.domains,
        "highlights": json.dumps({"default": project.highlights}),
        "display_order": (max_order or 0) + 1,
    })
    await db.commit()
    return {"id": project_id, **project.model_dump()}


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    name = project.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")

    result = await db.execute(text("""
        UPDATE projects SET name = :name, description = :description, stack = :stack,
               github_url = :github_url, live_url = :live_url, is_live = :is_live,
               domains = :domains, highlights = :highlights, updated_at = NOW()
        WHERE id = :id AND user_id = :user_id AND is_deleted = FALSE
    """), {
        "id": project_id, "user_id": user_id, "name": name, "description": project.description,
        "stack": project.stack, "github_url": project.github_url, "live_url": project.live_url,
        "is_live": project.is_live, "domains": project.domains,
        "highlights": json.dumps({"default": project.highlights}),
    })
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": project_id, **project.model_dump()}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        UPDATE projects SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = :id AND user_id = :user_id
    """), {"id": project_id, "user_id": user_id})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project removed"}


@router.get("/education")
async def list_education(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, degree, school, track, relevant_courses, start_date, end_date
        FROM education WHERE user_id = :user_id
        ORDER BY display_order
    """), {"user_id": user_id})).fetchall()
    return {"education": [{
        "id": str(r[0]), "degree": r[1], "school": r[2], "track": r[3],
        "relevant_courses": r[4],
        "start_date": str(r[5]) if r[5] else None,
        "end_date": str(r[6]) if r[6] else None,
    } for r in rows]}


@router.post("/education")
async def add_education(entry: EducationIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    degree = entry.degree.strip()
    school = entry.school.strip()
    if not degree or not school:
        raise HTTPException(status_code=400, detail="Degree and school are required")

    max_order = (await db.execute(text("""
        SELECT COALESCE(MAX(display_order), 0) FROM education WHERE user_id = :user_id
    """), {"user_id": user_id})).scalar()

    education_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO education (id, user_id, degree, school, track, relevant_courses,
                               start_date, end_date, display_order)
        VALUES (:id, :user_id, :degree, :school, :track, :relevant_courses,
                :start_date, :end_date, :display_order)
    """), {
        "id": education_id, "user_id": user_id, "degree": degree, "school": school,
        "track": entry.track, "relevant_courses": entry.relevant_courses,
        "start_date": entry.start_date, "end_date": entry.end_date,
        "display_order": (max_order or 0) + 1,
    })
    await db.commit()
    return {"id": education_id, **entry.model_dump(mode="json")}


@router.patch("/education/{education_id}")
async def update_education(education_id: str, entry: EducationIn, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    degree = entry.degree.strip()
    school = entry.school.strip()
    if not degree or not school:
        raise HTTPException(status_code=400, detail="Degree and school are required")

    result = await db.execute(text("""
        UPDATE education SET degree = :degree, school = :school, track = :track,
               relevant_courses = :relevant_courses, start_date = :start_date, end_date = :end_date
        WHERE id = :id AND user_id = :user_id
    """), {
        "id": education_id, "user_id": user_id, "degree": degree, "school": school,
        "track": entry.track, "relevant_courses": entry.relevant_courses,
        "start_date": entry.start_date, "end_date": entry.end_date,
    })
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Education entry not found")
    return {"id": education_id, **entry.model_dump(mode="json")}


@router.delete("/education/{education_id}")
async def delete_education(education_id: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    # No is_deleted column on this table (unlike skills/projects) — a hard
    # delete is correct here.
    result = await db.execute(text("""
        DELETE FROM education WHERE id = :id AND user_id = :user_id
    """), {"id": education_id, "user_id": user_id})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Education entry not found")
    return {"message": "Education entry removed"}
