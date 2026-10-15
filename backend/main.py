from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask
from typing import List, Optional
import sys
import os
import re
import shutil
import uuid
from api.routes.auth import router as auth_router
from api.routes.jobs import router as jobs_router
from api.routes.profile import router as profile_router
from api.routes.interviews import router as interviews_router
from api.routes.gmail import router as gmail_router
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.skill_extractor import extract_skills
from utils.skill_matcher import match_skills
from utils.project_scorer import select_projects
from utils.experience_selector import select_experience
from services.resume_generator import (
    generate_resume_autofit,
)
from db.database import get_db, init_db
from services.db_service import (
    get_user_skills, get_user_projects, get_user_experience,
    get_user_skills_by_category, get_user_education,
    get_user_profile, save_job, save_resume, log_activity
)
from services.auth_service import get_current_user_id
from services import rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


app = FastAPI(
    title="JobOS API",
    description="Multi-agent AI job search system for international students",
    version="1.0.0",
)

# register routers
app.include_router(auth_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(interviews_router, prefix="/api")
app.include_router(gmail_router, prefix="/api")

_default_origins = "http://localhost:5173,http://localhost:3000"
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Content-Disposition isn't in the CORS response-header safelist by
    # default — without this, frontend JS can't read the server-suggested
    # filename on a cross-origin fetch (which every deploy is: frontend and
    # backend are separately-hosted origins).
    expose_headers=["Content-Disposition"],
)

class JDRequest(BaseModel):
    # Length caps keep a single request from carrying an enormous payload.
    jd_text: str = Field(max_length=20_000)
    team_focus: Optional[str] = Field(default="", max_length=500)
    company: Optional[str] = Field(default="Company", max_length=200)
    role: Optional[str] = Field(default="Software Engineer Intern", max_length=200)


RESUME_DIR = "/tmp/jobos_resumes"
LIBREOFFICE_TIMEOUT_SECONDS = 120


def _safe_name(value: Optional[str], fallback: str) -> str:
    """Filename-safe text for the download name: letters, digits, dot,
    underscore and dash only, no leading or trailing punctuation."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", (value or "").strip()).strip("._-")[:60]
    return cleaned or fallback


def _remove_files(*paths: str) -> None:
    for path in paths:
        try:
            os.remove(path)
        except OSError:
            pass

@app.get("/")
async def root():
    return {"message": "JobOS API running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/resumes/analyze", dependencies=[Depends(rate_limit.limit_user("analyze", 60, 3600))])
async def analyze_jd(request: JDRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Analyze JD — extract skills, match profile, rank projects"""
    # Fetch from DB
    user_skills = await get_user_skills(db, user_id)
    user_projects = await get_user_projects(db, user_id)

    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], user_skills)
    projects = select_projects(
        projects=user_projects,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus
    )

    # Save job to DB
    await save_job(
        db, user_id,
        company=request.company or "Unknown",
        role=request.role or "Unknown",
        jd_text=request.jd_text,
        required_skills=extracted["all_skills"],
        preferred_skills=[],
        domain=(projects["selected"][0].get("domains") or ["unknown"])[0] if projects["selected"] else "unknown",
        team_focus=request.team_focus or "",
    )
    await log_activity(db, user_id, "job_analyzed", "job", metadata={"company": request.company, "role": request.role})

    return {
        "extracted_skills": extracted,
        "skill_match": match,
        "missing_skills": match["missing"],
        "recommended_projects": projects,
        "message": match["summary"]
    }


@app.post("/api/resumes/generate-pdf", dependencies=[Depends(rate_limit.limit_user("generate-pdf", 10, 3600))])
async def generate_pdf_endpoint(request: JDRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    """Full pipeline — analyze JD and generate tailored PDF resume."""
    import subprocess

    # Fetch from DB
    user_skills = await get_user_skills(db, user_id)
    user_projects = await get_user_projects(db, user_id)
    user_experience = await get_user_experience(db, user_id)
    user_profile = await get_user_profile(db, user_id)
    resume_skills = await get_user_skills_by_category(db, user_id)
    resume_education = await get_user_education(db, user_id)
    if not resume_skills or not user_profile.get("name"):
        raise HTTPException(status_code=400, detail="Add your skills in My Profile before generating a resume")

    # Step 1 — Extract and match
    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], user_skills)
    projects_result = select_projects(
        projects=user_projects,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus,
        max_projects=3
    )

    selected_projects = projects_result["selected"]
    selected_experience = select_experience(
        extracted_skills=extracted["all_skills"],
        domain=(selected_projects[0].get("domains") or ["fullstack"])[0] if selected_projects else "fullstack",
        experience=user_experience,
        max_jobs=3,
    )

    # Step 2 — Generate DOCX
    # Files on disk are named with a random id, never with user input; the
    # readable name is only used for the download header.
    person_name = _safe_name(user_profile.get("name"), "Resume")
    company = _safe_name(request.company, "Company")
    os.makedirs(RESUME_DIR, exist_ok=True)
    file_id = uuid.uuid4().hex
    docx_path = f"{RESUME_DIR}/{file_id}.docx"
    pdf_path = f"{RESUME_DIR}/{file_id}.pdf"

    try:
        generate_resume_autofit(
            profile=user_profile,
            skills=resume_skills,
            experience=selected_experience,
            projects=selected_projects,
            education=resume_education,
            output_path=docx_path,
            company_name=request.company,
            role_name=request.role,
        )

        # Step 3 — Convert to PDF (bounded, so a stuck conversion can't hang the server)
        soffice_bin = (
            shutil.which("soffice")
            or shutil.which("libreoffice")
            or "/Applications/LibreOffice.app/Contents/MacOS/soffice"
        )
        subprocess.run([
            soffice_bin,
            "--headless", "--convert-to", "pdf",
            "--outdir", RESUME_DIR,
            docx_path
        ], check=True, capture_output=True, timeout=LIBREOFFICE_TIMEOUT_SECONDS)

        # Step 4 — Save to DB
        await save_resume(db, user_id, job_id=None, file_path=pdf_path,
            skills_included=match["matching"],
            projects_selected=[p["name"] for p in selected_projects],
            experience_selected=[e["title"] for e in selected_experience])
        await log_activity(db, user_id, "resume_generated", "resume", metadata={"company": request.company, "format": "pdf"})
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        _remove_files(docx_path, pdf_path)
        raise HTTPException(status_code=500, detail="Resume conversion failed. Please try again.")
    except Exception:
        _remove_files(docx_path, pdf_path)
        raise

    # The files are served once and then deleted; nothing reads them again.
    return FileResponse(
        path=pdf_path,
        filename=f"{person_name}_{company}.pdf",
        media_type="application/pdf",
        background=BackgroundTask(_remove_files, docx_path, pdf_path),
    )
