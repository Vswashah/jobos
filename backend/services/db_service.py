"""
Database service — fetches user profile, skills, projects, experience from DB.
Replaces the hardcoded YOUR_SKILLS, YOUR_PROJECTS lists in main.py.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

USER_ID = "550e8400-e29b-41d4-a716-446655440000"

async def get_user_skills(db: AsyncSession) -> list:
    """Fetch all verified skills as a list of names"""
    result = await db.execute(text("""
        SELECT name FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": USER_ID})
    return [row[0] for row in result.fetchall()]


async def get_user_projects(db: AsyncSession) -> list:
    """Fetch all projects as list of dicts matching YOUR_PROJECTS format"""
    result = await db.execute(text("""
        SELECT name, description, stack, github_url, live_url,
               is_live, domains, highlights, display_order
        FROM projects
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": USER_ID})

    projects = []
    for row in result.fetchall():
        highlights_raw = row[7]
        if isinstance(highlights_raw, str):
            highlights_raw = json.loads(highlights_raw)
        highlights = highlights_raw.get("default", []) if highlights_raw else []

        projects.append({
            "name": row[0],
            "description": row[1],
            "stack": row[2] or [],
            "github_url": row[3],
            "live_url": row[4],
            "is_live": row[5],
            "domains": row[6] or [],
            "highlights": highlights,
            "date": "2026",
        })
    return projects


async def get_user_experience(db: AsyncSession) -> list:
    """Fetch all experience entries as list of dicts"""
    result = await db.execute(text("""
        SELECT title, company, location, dates, bullets, domains
        FROM experience
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": USER_ID})

    return [{
        "title": row[0],
        "company": row[1],
        "location": row[2],
        "dates": row[3],
        "bullets": row[4] or [],
        "domains": row[5] or [],
    } for row in result.fetchall()]


async def get_user_profile(db: AsyncSession) -> dict:
    """Fetch user profile"""
    result = await db.execute(text("""
        SELECT name, email, phone, linkedin_url, github_url, portfolio_url
        FROM user_profiles
        WHERE id = :user_id AND is_deleted = FALSE
    """), {"user_id": USER_ID})
    row = result.fetchone()
    if not row:
        return {}
    return {
        "name": row[0],
        "email": row[1],
        "phone": row[2],
        "linkedin": row[3],
        "github": row[4],
        "portfolio": row[5],
    }


async def save_job(db: AsyncSession, company: str, role: str, jd_text: str,
                   required_skills: list, preferred_skills: list,
                   domain: str, team_focus: str) -> str:
    """Save analyzed job to database, return job ID"""
    import uuid
    job_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO jobs (id, company, role, jd_text, required_skills,
                         preferred_skills, domain, team_focus, status)
        VALUES (:id, :company, :role, :jd_text, :required_skills,
                :preferred_skills, :domain, :team_focus, 'found')
    """), {
        "id": job_id,
        "company": company,
        "role": role,
        "jd_text": jd_text,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "domain": domain,
        "team_focus": team_focus,
    })
    await db.commit()
    return job_id


async def save_resume(db: AsyncSession, job_id: str, file_path: str,
                      skills_included: list, projects_selected: list,
                      experience_selected: list) -> str:
    """Save generated resume to database"""
    import uuid
    resume_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO resumes (id, job_id, file_path, skills_included,
                            projects_selected, experience_selected)
        VALUES (:id, :job_id, :file_path, :skills_included,
                :projects_selected, :experience_selected)
    """), {
        "id": resume_id,
        "job_id": job_id,
        "file_path": file_path,
        "skills_included": skills_included,
        "projects_selected": projects_selected,
        "experience_selected": experience_selected,
    })
    await db.commit()
    return resume_id


async def log_activity(db: AsyncSession, action: str, entity_type: str,
                       entity_id: str = None, metadata: dict = None):
    """Log activity for dashboard recent activity"""
    import uuid, json
    await db.execute(text("""
        INSERT INTO activity_log (id, action, entity_type, entity_id, metadata)
        VALUES (:id, :action, :entity_type, :entity_id, :metadata)
    """), {
        "id": str(uuid.uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": json.dumps(metadata or {}),
    })
    await db.commit()
