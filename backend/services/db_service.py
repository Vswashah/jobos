"""
Database service — every function is scoped to a specific user_id (the
authenticated caller), obtained via services.auth_service.get_current_user_id.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

async def get_user_skills(db: AsyncSession, user_id: str) -> list:
    """Fetch all verified skills as a list of names"""
    result = await db.execute(text("""
        SELECT name FROM skills
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY category, name
    """), {"user_id": user_id})
    return [row[0] for row in result.fetchall()]


async def get_user_projects(db: AsyncSession, user_id: str) -> list:
    """Fetch all projects as list of dicts matching YOUR_PROJECTS format"""
    result = await db.execute(text("""
        SELECT name, description, stack, github_url, live_url,
               is_live, domains, highlights, display_order
        FROM projects
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": user_id})

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


async def get_user_experience(db: AsyncSession, user_id: str) -> list:
    """Fetch all experience entries as list of dicts"""
    result = await db.execute(text("""
        SELECT title, company, location, dates, bullets, domains
        FROM experience
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY display_order
    """), {"user_id": user_id})

    return [{
        "title": row[0],
        "company": row[1],
        "location": row[2],
        "dates": row[3],
        "bullets": row[4] or [],
        "domains": row[5] or [],
    } for row in result.fetchall()]


async def get_user_profile(db: AsyncSession, user_id: str) -> dict:
    """Fetch user profile"""
    result = await db.execute(text("""
        SELECT name, email, phone, linkedin_url, github_url, portfolio_url,
               graduation_date, visa_status
        FROM user_profiles
        WHERE id = :user_id AND is_deleted = FALSE
    """), {"user_id": user_id})
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
        "graduation_date": str(row[6]) if row[6] else None,
        "visa_status": row[7],
    }


async def save_job(db: AsyncSession, user_id: str, company: str, role: str, jd_text: str,
                   required_skills: list, preferred_skills: list,
                   domain: str, team_focus: str, location: str = None,
                   remote_type: str = None, source_url: str = None,
                   h1b_sponsor: bool = None, f1_eligible: bool = True,
                   deadline: str = None) -> str:
    """Save analyzed job to database, return job ID"""
    import uuid
    job_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO jobs (id, user_id, company, role, jd_text, required_skills,
                         preferred_skills, domain, team_focus, status,
                         location, remote_type, source_url, h1b_sponsor,
                         f1_eligible, deadline)
        VALUES (:id, :user_id, :company, :role, :jd_text, :required_skills,
                :preferred_skills, :domain, :team_focus, 'found',
                :location, :remote_type, :source_url, :h1b_sponsor,
                :f1_eligible, :deadline)
    """), {
        "id": job_id,
        "user_id": user_id,
        "company": company,
        "role": role,
        "jd_text": jd_text,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "domain": domain,
        "team_focus": team_focus,
        "location": location,
        "remote_type": remote_type,
        "source_url": source_url,
        "h1b_sponsor": h1b_sponsor,
        "f1_eligible": f1_eligible,
        "deadline": deadline,
    })
    await db.commit()
    return job_id


async def save_resume(db: AsyncSession, user_id: str, job_id: str, file_path: str,
                      skills_included: list, projects_selected: list,
                      experience_selected: list) -> str:
    """Save generated resume to database"""
    import uuid
    resume_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO resumes (id, user_id, job_id, file_path, skills_included,
                            projects_selected, experience_selected)
        VALUES (:id, :user_id, :job_id, :file_path, :skills_included,
                :projects_selected, :experience_selected)
    """), {
        "id": resume_id,
        "user_id": user_id,
        "job_id": job_id,
        "file_path": file_path,
        "skills_included": skills_included,
        "projects_selected": projects_selected,
        "experience_selected": experience_selected,
    })
    await db.commit()
    return resume_id


async def log_activity(db: AsyncSession, user_id: str, action: str, entity_type: str,
                       entity_id: str = None, metadata: dict = None):
    """Log activity for dashboard recent activity"""
    import uuid, json
    await db.execute(text("""
        INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, metadata)
        VALUES (:id, :user_id, :action, :entity_type, :entity_id, :metadata)
    """), {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": json.dumps(metadata or {}),
    })
    await db.commit()


# ── Settings (key/value, per user) ──────────────────────────────────────────

async def get_setting(db: AsyncSession, user_id: str, key: str) -> str | None:
    result = await db.execute(text("""
        SELECT value FROM settings WHERE user_id = :user_id AND key = :key
    """), {"user_id": user_id, "key": key})
    row = result.fetchone()
    return row[0] if row else None


async def set_setting(db: AsyncSession, user_id: str, key: str, value: str, category: str = "gmail"):
    import uuid
    await db.execute(text("""
        INSERT INTO settings (id, user_id, key, value, category)
        VALUES (:id, :user_id, :key, :value, :category)
        ON CONFLICT (user_id, key) DO UPDATE SET value = :value, updated_at = NOW()
    """), {"id": str(uuid.uuid4()), "user_id": user_id, "key": key, "value": value, "category": category})
    await db.commit()


async def delete_setting(db: AsyncSession, user_id: str, key: str):
    await db.execute(text("""
        DELETE FROM settings WHERE user_id = :user_id AND key = :key
    """), {"user_id": user_id, "key": key})
    await db.commit()


# ── Applications & Interviews ───────────────────────────────────────────────

async def find_job_by_company(db: AsyncSession, user_id: str, company: str):
    """Best-effort match on company name — case-insensitive, most recent first"""
    result = await db.execute(text("""
        SELECT id FROM jobs
        WHERE user_id = :user_id AND is_deleted = FALSE AND LOWER(company) = LOWER(:company)
        ORDER BY found_at DESC
        LIMIT 1
    """), {"user_id": user_id, "company": company})
    row = result.fetchone()
    return str(row[0]) if row else None


async def find_job_by_source_url(db: AsyncSession, user_id: str, source_url: str):
    """Dedup key for discovered postings — unlike company-level dedup, two
    different roles at the same company should both be kept."""
    result = await db.execute(text("""
        SELECT id FROM jobs
        WHERE user_id = :user_id AND is_deleted = FALSE AND source_url = :source_url
        LIMIT 1
    """), {"user_id": user_id, "source_url": source_url})
    row = result.fetchone()
    return str(row[0]) if row else None


async def find_or_create_application(db: AsyncSession, job_id: str) -> str:
    """Get the application for a job, creating one (status='applied') if none exists yet.
    job_id is trusted to already belong to the calling user — callers obtain
    it via find_job_by_company(db, user_id, ...), which scopes it."""
    result = await db.execute(text("""
        SELECT id FROM applications WHERE job_id = :job_id AND is_deleted = FALSE
        ORDER BY created_at DESC LIMIT 1
    """), {"job_id": job_id})
    row = result.fetchone()
    if row:
        return str(row[0])

    import uuid
    application_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO applications (id, job_id, status)
        VALUES (:id, :job_id, 'applied')
    """), {"id": application_id, "job_id": job_id})
    await db.commit()
    return application_id


async def find_existing_interview(db: AsyncSession, application_id: str, interview_date, round_num: int):
    """Dedupe guard — same application + same date + same round is treated as the same interview"""
    result = await db.execute(text("""
        SELECT id FROM interviews
        WHERE application_id = :application_id
        AND interview_date = :interview_date
        AND round = :round_num
    """), {"application_id": application_id, "interview_date": interview_date, "round_num": round_num})
    row = result.fetchone()
    return str(row[0]) if row else None


async def save_interview(db: AsyncSession, application_id: str, round_num: int, format: str,
                         interview_date, interviewer_name: str = None, notes: str = None) -> str:
    import uuid
    interview_id = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO interviews (id, application_id, round, format, interview_date, interviewer_name, notes)
        VALUES (:id, :application_id, :round_num, :format, :interview_date, :interviewer_name, :notes)
    """), {
        "id": interview_id,
        "application_id": application_id,
        "round_num": round_num,
        "format": format,
        "interview_date": interview_date,
        "interviewer_name": interviewer_name,
        "notes": notes,
    })
    await db.commit()
    return interview_id


async def list_interviews(db: AsyncSession, user_id: str) -> list:
    result = await db.execute(text("""
        SELECT i.id, j.company, j.role, i.round, i.format, i.interview_date,
               i.interviewer_name, i.outcome, i.notes, a.id as application_id
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        WHERE j.is_deleted = FALSE AND j.user_id = :user_id
        ORDER BY i.interview_date ASC NULLS LAST
    """), {"user_id": user_id})
    return [{
        "id": str(row[0]),
        "company": row[1],
        "role": row[2],
        "round": row[3],
        "format": row[4],
        "interview_date": str(row[5]) if row[5] else None,
        "interviewer_name": row[6],
        "outcome": row[7],
        "notes": row[8],
        "application_id": str(row[9]),
    } for row in result.fetchall()]
