from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db
from services.auth_service import get_current_user_id
from services import db_service, job_discovery_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _parse_deadline(value: str | None):
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None

STREAK_WINDOW_DAYS = 84  # 12 weeks, for the GitHub-style activity grid

VALID_STATUSES = {"found", "applied", "interviewing", "offered", "rejected"}

@router.get("/")
async def get_jobs(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Get all analyzed jobs with status"""
    result = await db.execute(text("""
        SELECT id, company, role, location, remote_type,
               required_skills, status, found_at, applied_at,
               h1b_sponsor, f1_eligible, source_url
        FROM jobs
        WHERE is_deleted = FALSE AND user_id = :user_id
        ORDER BY found_at DESC
    """), {"user_id": user_id})
    rows = result.fetchall()
    return {
        "jobs": [{
            "id": str(row[0]),
            "company": row[1],
            "role": row[2],
            "location": row[3],
            "remote_type": row[4],
            "required_skills": row[5] or [],
            "status": row[6],
            "found_at": str(row[7]),
            "applied_at": str(row[8]) if row[8] else None,
            "h1b_sponsor": row[9],
            "f1_eligible": row[10],
            "source_url": row[11],
        } for row in rows],
        "total": len(rows)
    }


@router.post("/discover")
async def discover_jobs_endpoint(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Search the live web (via Grok) for F1/OPT-eligible postings and save new ones."""
    skills = await db_service.get_user_skills(db, user_id)
    profile = await db_service.get_user_profile(db, user_id)
    postings = await job_discovery_service.discover_jobs(skills, profile.get("graduation_date"))

    found = 0
    skipped = 0
    for p in postings:
        if p.get("f1_eligible") is False:
            skipped += 1
            continue
        existing = await db_service.find_job_by_source_url(db, user_id, p["source_url"])
        if existing:
            skipped += 1
            continue

        job_id = await db_service.save_job(
            db, user_id,
            company=p["company"],
            role=p.get("role") or "Unknown",
            jd_text=p.get("jd_summary") or "",
            required_skills=p.get("required_skills") or [],
            preferred_skills=[],
            domain="unknown",
            team_focus="",
            location=p.get("location"),
            remote_type=p.get("remote_type"),
            source_url=p["source_url"],
            h1b_sponsor=p.get("h1b_sponsor"),
            f1_eligible=p.get("f1_eligible", True),
            deadline=_parse_deadline(p.get("deadline")),
        )
        await db_service.log_activity(db, user_id, "job_discovered", "job", job_id, metadata={"company": p["company"]})
        found += 1

    return {"scanned": len(postings), "found": found, "skipped": skipped}


@router.patch("/{job_id}/status")
async def update_job_status(job_id: str, status: str, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Update job status — found/applied/interviewing/offered/rejected"""
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {sorted(VALID_STATUSES)}")

    result = await db.execute(text("""
        UPDATE jobs SET status = :status,
        applied_at = CASE WHEN CAST(:status AS VARCHAR) = 'applied' THEN NOW() ELSE applied_at END
        WHERE id = :job_id AND user_id = :user_id
    """), {"status": status, "job_id": job_id, "user_id": user_id})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Status updated", "status": status}


@router.get("/analytics")
async def get_analytics(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Dashboard stats"""
    result = await db.execute(text("""
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
            COUNT(CASE WHEN status = 'interviewing' THEN 1 END) as interviewing,
            COUNT(CASE WHEN status = 'offered' THEN 1 END) as offered,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM jobs WHERE is_deleted = FALSE AND user_id = :user_id
    """), {"user_id": user_id})
    row = result.fetchone()

    resume_count = await db.execute(text("""
        SELECT COUNT(*) FROM resumes WHERE is_deleted = FALSE AND user_id = :user_id
    """), {"user_id": user_id})

    activity = await db.execute(text("""
        SELECT action, entity_type, metadata, created_at
        FROM activity_log
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT 10
    """), {"user_id": user_id})

    return {
        "stats": {
            "total_analyzed": row[0],
            "applied": row[1],
            "interviewing": row[2],
            "offered": row[3],
            "rejected": row[4],
            "resumes_generated": resume_count.fetchone()[0],
        },
        "recent_activity": [{
            "action": r[0],
            "entity_type": r[1],
            "metadata": r[2],
            "created_at": str(r[3])
        } for r in activity.fetchall()]
    }


@router.get("/streak")
async def get_streak(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Activity streak — consecutive days with at least one logged action (JD analyzed, resume generated, etc.)"""
    today = (await db.execute(text("SELECT CURRENT_DATE"))).scalar()

    result = await db.execute(text("""
        SELECT DATE(created_at) as day, COUNT(*) as cnt
        FROM activity_log
        WHERE user_id = :user_id
        AND created_at >= CURRENT_DATE - make_interval(days => :window_days)
        GROUP BY DATE(created_at)
    """), {"user_id": user_id, "window_days": STREAK_WINDOW_DAYS - 1})
    counts = {row[0]: row[1] for row in result.fetchall()}

    days = [today - timedelta(days=i) for i in range(STREAK_WINDOW_DAYS - 1, -1, -1)]
    grid = [{"date": d.isoformat(), "count": counts.get(d, 0)} for d in days]

    # Count backward from today; if today has no activity yet, start from
    # yesterday so an ongoing streak isn't broken before the day is over.
    active_today = counts.get(today, 0) > 0
    current_streak = 0
    cursor = today if active_today else today - timedelta(days=1)
    while counts.get(cursor, 0) > 0:
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    running = 0
    for d in days:
        if counts.get(d, 0) > 0:
            running += 1
            longest_streak = max(longest_streak, running)
        else:
            running = 0

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "active_today": active_today,
        "grid": grid,
    }


@router.get("/top-skills")
async def get_top_skills(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db), limit: int = 8):
    """Most frequently required skills across every analyzed JD"""
    result = await db.execute(text("""
        SELECT skill, COUNT(*) as cnt
        FROM jobs, unnest(required_skills) as skill
        WHERE is_deleted = FALSE AND user_id = :user_id
        GROUP BY skill
        ORDER BY cnt DESC, skill ASC
        LIMIT :limit
    """), {"user_id": user_id, "limit": limit})
    return {"skills": [{"skill": row[0], "count": row[1]} for row in result.fetchall()]}
