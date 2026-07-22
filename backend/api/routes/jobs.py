from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.database import get_db

router = APIRouter(prefix="/jobs", tags=["jobs"])

VALID_STATUSES = {"found", "applied", "interviewing", "offered", "rejected"}

@router.get("/")
async def get_jobs(db: AsyncSession = Depends(get_db)):
    """Get all analyzed jobs with status"""
    result = await db.execute(text("""
        SELECT id, company, role, location, remote_type,
               required_skills, status, found_at, applied_at,
               h1b_sponsor, f1_eligible
        FROM jobs
        WHERE is_deleted = FALSE
        ORDER BY found_at DESC
    """))
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
        } for row in rows],
        "total": len(rows)
    }


@router.patch("/{job_id}/status")
async def update_job_status(job_id: str, status: str, db: AsyncSession = Depends(get_db)):
    """Update job status — found/applied/interviewing/offered/rejected"""
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {sorted(VALID_STATUSES)}")

    result = await db.execute(text("""
        UPDATE jobs SET status = :status,
        applied_at = CASE WHEN CAST(:status AS VARCHAR) = 'applied' THEN NOW() ELSE applied_at END
        WHERE id = :job_id
    """), {"status": status, "job_id": job_id})
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Status updated", "status": status}


@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Dashboard stats"""
    result = await db.execute(text("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied,
            COUNT(CASE WHEN status = 'interviewing' THEN 1 END) as interviewing,
            COUNT(CASE WHEN status = 'offered' THEN 1 END) as offered,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM jobs WHERE is_deleted = FALSE
    """))
    row = result.fetchone()

    resume_count = await db.execute(text("SELECT COUNT(*) FROM resumes WHERE is_deleted = FALSE"))
    
    activity = await db.execute(text("""
        SELECT action, entity_type, metadata, created_at
        FROM activity_log
        ORDER BY created_at DESC
        LIMIT 10
    """))

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
