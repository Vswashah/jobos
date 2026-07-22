from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import shutil
from api.routes.jobs import router as jobs_router
from api.routes.profile import router as profile_router
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.skill_extractor import extract_skills
from utils.skill_matcher import match_skills
from utils.project_scorer import select_projects
from utils.experience_selector import select_experience
from services.resume_generator import (
    generate_resume,
    generate_resume_autofit,
    DEFAULT_PROFILE,
    DEFAULT_EDUCATION,
    DEFAULT_EXPERIENCE,
    DEFAULT_RESEARCH,
)
from db.database import get_db, init_db
from services.db_service import (
    get_user_skills, get_user_projects, get_user_experience,
    get_user_profile, save_job, save_resume, log_activity
)
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends


app = FastAPI(
    title="JobOS API",
    description="Multi-agent AI job search system for international students",
    version="1.0.0",
)

# register routers
app.include_router(jobs_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

_default_origins = "http://localhost:5173,http://localhost:3000"
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SKILLS_TEMPLATE = {
    "Languages": "Python, JavaScript, TypeScript, Go, C++, SQL, Bash",
    "Backend": "FastAPI, Flask, Node.js, NestJS, REST APIs, PostgreSQL, MySQL, Redis",
    "AI & ML": "LangChain, LangGraph, LiteLLM, RAG, pgvector, Scikit-learn, PyTorch",
    "Cloud": "AWS (Lambda, S3, EKS), Docker, Kubernetes, Terraform, GitHub Actions CI/CD",
    "Data": "Apache Kafka, pandas, NumPy, Prometheus, Grafana, ETL pipelines",
    "Frontend": "React.js, TypeScript, Next.js, HTML5, CSS3",
}


def select_experience_for_resume(extracted_skills, domain, max_jobs=3, experience=None):
    exp_list = experience if experience else DEFAULT_EXPERIENCE
    selected_experience = select_experience(
        experience=exp_list,
        extracted_skills=extracted_skills,
        domain=domain,
        max_jobs=max_jobs,
    )
    if len(selected_experience) < max_jobs:
        selected_experience = exp_list[:max_jobs]
    return selected_experience


class JDRequest(BaseModel):
    jd_text: str
    team_focus: Optional[str] = ""
    company: Optional[str] = "Company"
    role: Optional[str] = "Software Engineer Intern"

@app.get("/")
async def root():
    return {"message": "JobOS API running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/resumes/analyze")
async def analyze_jd(request: JDRequest, db: AsyncSession = Depends(get_db)):
    """Analyze JD — extract skills, match profile, rank projects"""
    # Fetch from DB
    user_skills = await get_user_skills(db)
    user_projects = await get_user_projects(db)

    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], user_skills)
    projects = select_projects(
        projects=user_projects,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus
    )

    # Save job to DB
    await save_job(
        db,
        company=request.company or "Unknown",
        role=request.role or "Unknown",
        jd_text=request.jd_text,
        required_skills=extracted["all_skills"],
        preferred_skills=[],
        domain=(projects["selected"][0].get("domains") or ["unknown"])[0] if projects["selected"] else "unknown",
        team_focus=request.team_focus or "",
    )
    await log_activity(db, "job_analyzed", "job", metadata={"company": request.company, "role": request.role})

    return {
        "extracted_skills": extracted,
        "skill_match": match,
        "missing_skills": match["missing"],
        "recommended_projects": projects,
        "message": match["summary"]
    }


@app.post("/api/resumes/generate")
async def generate_resume_endpoint(request: JDRequest, db: AsyncSession = Depends(get_db)):
    """Full pipeline — analyze JD and generate tailored DOCX resume."""
    # Fetch from DB
    user_skills = await get_user_skills(db)
    user_projects = await get_user_projects(db)
    user_experience = await get_user_experience(db)
    user_profile = await get_user_profile(db)

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
    selected_experience = select_experience_for_resume(
        extracted_skills=extracted["all_skills"],
        domain=(selected_projects[0].get("domains") or ["fullstack"])[0] if selected_projects else "fullstack",
        experience=user_experience,
        max_jobs=3,
    )

    # Step 2 — Generate resume file
    filename = f"Vishwaa_Shah_{request.company.replace(' ', '_')}.docx"
    output_path = f"/tmp/jobos_resumes/{filename}"

    include_research = any(
        s in extracted["all_skills"]
        for s in ["pytorch", "scikit-learn", "langchain", "llm", "machine learning"]
    ) or "research" in (request.team_focus or "").lower()

    generate_resume(
        profile=user_profile or DEFAULT_PROFILE,
        skills=SKILLS_TEMPLATE,
        experience=selected_experience,
        projects=selected_projects,
        education=DEFAULT_EDUCATION,
        research=DEFAULT_RESEARCH if include_research else None,
        output_path=output_path,
        company_name=request.company,
        role_name=request.role,
    )

    # Save to DB
    await save_resume(db, job_id=None, file_path=output_path,
        skills_included=match["matching"],
        projects_selected=[p["name"] for p in selected_projects],
        experience_selected=[e["title"] for e in selected_experience])
    await log_activity(db, "resume_generated", "resume", metadata={"company": request.company})

    return FileResponse(
        path=output_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
@app.post("/api/resumes/generate-pdf")
async def generate_pdf_endpoint(request: JDRequest, db: AsyncSession = Depends(get_db)):
    """Full pipeline — analyze JD and generate tailored PDF resume."""
    import subprocess

    # Fetch from DB
    user_skills = await get_user_skills(db)
    user_projects = await get_user_projects(db)
    user_experience = await get_user_experience(db)
    user_profile = await get_user_profile(db)

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
    selected_experience = select_experience_for_resume(
        extracted_skills=extracted["all_skills"],
        domain=(selected_projects[0].get("domains") or ["fullstack"])[0] if selected_projects else "fullstack",
        experience=user_experience,
        max_jobs=3,
    )

    # Step 2 — Generate DOCX
    company = request.company.replace(' ', '_')
    os.makedirs("/tmp/jobos_resumes", exist_ok=True)
    docx_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.docx"
    pdf_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.pdf"

    include_research = any(
        s in extracted["all_skills"]
        for s in ["pytorch", "scikit-learn", "langchain", "llm", "machine learning"]
    ) or "research" in (request.team_focus or "").lower()

    generate_resume_autofit(
        profile=user_profile or DEFAULT_PROFILE,
        skills=SKILLS_TEMPLATE,
        experience=selected_experience,
        projects=selected_projects,
        education=DEFAULT_EDUCATION,
        research=DEFAULT_RESEARCH if include_research else None,
        output_path=docx_path,
        company_name=request.company,
        role_name=request.role,
    )

    # Step 3 — Convert to PDF
    soffice_bin = (
        shutil.which("soffice")
        or shutil.which("libreoffice")
        or "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    )
    subprocess.run([
        soffice_bin,
        "--headless", "--convert-to", "pdf",
        "--outdir", "/tmp/jobos_resumes/",
        docx_path
    ], check=True)

    # Step 4 — Save to DB and return
    await save_resume(db, job_id=None, file_path=pdf_path,
        skills_included=match["matching"],
        projects_selected=[p["name"] for p in selected_projects],
        experience_selected=[e["title"] for e in selected_experience])
    await log_activity(db, "resume_generated", "resume", metadata={"company": request.company, "format": "pdf"})

    return FileResponse(
        path=pdf_path,
        filename=f"Vishwaa_Shah_{company}.pdf",
        media_type="application/pdf"
    )
