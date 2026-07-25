from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from services import db_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


class InterviewIn(BaseModel):
    company: str
    round: int = 1
    format: str = "other"
    interview_date: datetime | None = None
    interviewer_name: str | None = None
    notes: str | None = None


@router.get("/")
async def list_interviews(db: AsyncSession = Depends(get_db)):
    return {"interviews": await db_service.list_interviews(db)}


@router.post("/")
async def create_interview(interview: InterviewIn, db: AsyncSession = Depends(get_db)):
    """Manually log an interview for a company you've already analyzed a JD for."""
    job_id = await db_service.find_job_by_company(db, interview.company)
    if not job_id:
        raise HTTPException(
            status_code=404,
            detail=f"No job found for company '{interview.company}' — analyze a JD for them first",
        )
    application_id = await db_service.find_or_create_application(db, job_id)
    interview_id = await db_service.save_interview(
        db, application_id, interview.round, interview.format,
        interview.interview_date, interview.interviewer_name, interview.notes,
    )
    return {"id": interview_id}
