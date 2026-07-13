from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.skill_extractor import extract_skills
from utils.skill_matcher import match_skills
from utils.project_scorer import select_projects
from utils.experience_selector import select_experience
from services.resume_generator import (
    generate_resume,
    DEFAULT_PROFILE,
    DEFAULT_EDUCATION,
    DEFAULT_EXPERIENCE,
    DEFAULT_RESEARCH,
)

app = FastAPI(
    title="JobOS API",
    description="Multi-agent AI job search system for international students",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

YOUR_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "FastAPI", "Flask", "PostgreSQL", "MySQL", "Redis",
    "Docker", "Kubernetes", "AWS", "GitHub Actions", "Git",
    "LangChain", "LangGraph", "LiteLLM", "Kafka", "Prometheus",
    "Grafana", "Terraform", "Linux", "Bash", "SQL", "Go"
]

YOUR_PROJECTS = [
    {
        "name": "Fleet Telemetry Pipeline",
        "description": "Real-time vehicle telemetry pipeline processing 10K+ events/day",
        "stack": ["Python", "Go", "Kafka", "Redis", "PostgreSQL", "Prometheus", "Grafana", "AWS", "Docker", "Kubernetes"],
        "is_live": False,
        "date": "Jun 2026",
        "github_url": "github.com/Vswashah/fleet-telemetry",
        "highlights": [
            "Built distributed pipeline processing 10K+ events/day with 99% uptime — Kafka ingestion, Isolation Forest anomaly detection, PostgreSQL storage, Redis caching for <50ms lookups.",
            "Full observability stack — Prometheus scrapes metrics, Grafana dashboards visualize throughput and anomaly rates in real time; deployed on AWS EKS with Terraform IaC and GitHub Actions CI/CD.",
        ]
    },
    {
        "name": "Trackly",
        "description": "Full-stack AI project tracking platform with RAG pipeline",
        "stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "LangChain", "pgvector", "Docker", "AWS"],
        "is_live": True,
        "date": "Mar 2026",
        "live_url": "trackly-eta-flame.vercel.app",
        "highlights": [
            "Shipped production SaaS platform solo — React/TypeScript frontend, Node.js REST API, PostgreSQL with pgvector, LangChain RAG pipeline delivering semantic search in <2s; live with real users.",
            "AI-powered duplicate detection reduces manual entries 40% — LLM analyzes new tickets against existing history and auto-suggests resolutions; zero-downtime deployments via Kubernetes and GitHub Actions.",
        ]
    },
    {
        "name": "Phantom",
        "description": "Multi-agent AI debate system using LangGraph and LiteLLM",
        "stack": ["Python", "LangGraph", "LiteLLM", "FastAPI", "pgvector", "Docker"],
        "is_live": False,
        "date": "Jun 2026",
        "github_url": "github.com/Vswashah/phantom",
        "highlights": [
            "Built production multi-agent AI system in under 2 weeks — LangGraph orchestrates 3 agents with real-time web search tool calling; LiteLLM handles multi-model inference across GPT, Claude, and Llama.",
            "FastAPI REST backend serves structured debate outputs; pgvector stores semantic agent memory; open-source with comprehensive documentation and architecture diagrams.",
        ]
    },
    {
        "name": "AEGIS Platform",
        "description": "AI-powered IT and security compliance platform",
        "stack": ["Python", "React", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        "is_live": False,
        "date": "2025",
        "highlights": [
            "Co-founded Resilient Privacy and architected AEGIS — AI-powered IT security platform unifying ticketing, endpoint management, and knowledge base; selected for CometX Accelerator with Harvard Business School Foundry.",
            "Placed top 20 out of 181 teams at Draper Pitch Competition — judges cited unified data architecture and native AI integration as key differentiators over competitors like ServiceNow and ManageEngine.",
        ]
    }
]

SKILLS_TEMPLATE = {
    "Languages": "Python, JavaScript, TypeScript, Go, C++, SQL, Bash",
    "Backend": "FastAPI, Flask, Node.js, NestJS, REST APIs, PostgreSQL, MySQL, Redis",
    "AI & ML": "LangChain, LangGraph, LiteLLM, RAG, pgvector, Scikit-learn, PyTorch",
    "Cloud": "AWS (Lambda, S3, EKS), Docker, Kubernetes, Terraform, GitHub Actions CI/CD",
    "Data": "Apache Kafka, pandas, NumPy, Prometheus, Grafana, ETL pipelines",
    "Frontend": "React.js, TypeScript, Next.js, HTML5, CSS3",
}


def select_experience_for_resume(extracted_skills, domain, max_jobs=3):
    selected_experience = select_experience(
        experience=DEFAULT_EXPERIENCE,
        extracted_skills=extracted_skills,
        domain=domain,
        max_jobs=max_jobs,
    )
    if len(selected_experience) < max_jobs:
        selected_experience = DEFAULT_EXPERIENCE[:max_jobs]
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
async def analyze_jd(request: JDRequest):
    """Analyze JD — extract skills, match profile, rank projects"""
    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], YOUR_SKILLS)
    projects = select_projects(
        projects=YOUR_PROJECTS,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus
    )
    return {
        "extracted_skills": extracted,
        "skill_match": match,
        "missing_skills": match["missing"],
        "recommended_projects": projects,
        "message": match["summary"]
    }

@app.post("/api/resumes/generate")
async def generate_resume_endpoint(request: JDRequest):
    """
    Full pipeline — analyze JD and generate tailored DOCX resume.
    Returns the file for download.
    """
    # Step 1 — Extract and match
    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], YOUR_SKILLS)
    projects_result = select_projects(
        projects=YOUR_PROJECTS,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus,
        max_projects=3
    )

    # Step 2 — Pick top 3 projects
    selected_projects = projects_result["selected"]
    selected_experience = select_experience_for_resume(
        extracted_skills=extracted["all_skills"],
        domain=projects_result["selected"][0].get("domains", ["fullstack"])[0] if projects_result["selected"] else "fullstack",
        max_jobs=3,
    )

    # Step 3 — Generate resume file
    filename = f"Vishwaa_Shah_{request.company.replace(' ', '_')}.docx"
    output_path = f"/tmp/jobos_resumes/{filename}"

    # Include research for AI/ML/security roles
    include_research = any(
        s in extracted["all_skills"]
        for s in ["pytorch", "scikit-learn", "langchain", "llm", "machine learning"]
    ) or "research" in (request.team_focus or "").lower()

    generate_resume(
        profile=DEFAULT_PROFILE,
        skills=SKILLS_TEMPLATE,
        experience=selected_experience,
        projects=selected_projects,
        education=DEFAULT_EDUCATION,
        research=DEFAULT_RESEARCH if include_research else None,
        output_path=output_path,
        company_name=request.company,
        role_name=request.role,
    )

    # Step 4 — Return file
    return FileResponse(
        path=output_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.post("/api/resumes/generate-pdf")
async def generate_pdf_endpoint(request: JDRequest):
    """
    Full pipeline — analyze JD and generate tailored PDF resume.
    """
    from docx2pdf import convert
    import platform

    # Step 1 — Extract and match
    extracted = extract_skills(request.jd_text)
    match = match_skills(extracted["all_skills"], YOUR_SKILLS)
    projects_result = select_projects(
        projects=YOUR_PROJECTS,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus,
        max_projects=3
    )

    selected_projects = projects_result["selected"]

    # Step 2 — Generate DOCX first
    company = request.company.replace(' ', '_')
    os.makedirs("/tmp/jobos_resumes", exist_ok=True)
    docx_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.docx"
    pdf_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.pdf"

    # Include research for AI/ML/security roles
    include_research = any(
        s in extracted["all_skills"]
        for s in ["pytorch", "scikit-learn", "langchain", "llm", "machine learning"]
    ) or "research" in (request.team_focus or "").lower()

    generate_resume(
        profile=DEFAULT_PROFILE,
        skills=SKILLS_TEMPLATE,
        experience=selected_experience,
        projects=selected_projects,
        education=DEFAULT_EDUCATION,
        research=DEFAULT_RESEARCH if include_research else None,
        output_path=docx_path,
        company_name=request.company,
        role_name=request.role,
    )

    # Step 3 — Convert DOCX to PDF
    convert(docx_path, pdf_path)

    # Step 4 — Return PDF
    return FileResponse(
        path=pdf_path,
        filename=f"Vishwaa_Shah_{company}.pdf",
        media_type="application/pdf"
    )


@app.post("/api/resumes/generate-pdf")
async def generate_pdf_endpoint(request: JDRequest):
    """Generate tailored PDF resume from JD"""
    import subprocess

    # Step 1 — Extract and match
    extracted = extract_skills(request.jd_text)
    projects_result = select_projects(
        projects=YOUR_PROJECTS,
        extracted_skills=extracted["all_skills"],
        team_focus=request.team_focus,
        max_projects=3
    )

    selected_projects = projects_result["selected"]
    selected_experience = select_experience_for_resume(
        extracted_skills=extracted["all_skills"],
        domain=projects_result["selected"][0].get("domains", ["fullstack"])[0] if projects_result["selected"] else "fullstack",
        max_jobs=3,
    )

    # Step 2 — Generate DOCX
    company = request.company.replace(' ', '_')
    os.makedirs("/tmp/jobos_resumes", exist_ok=True)
    docx_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.docx"
    pdf_path = f"/tmp/jobos_resumes/Vishwaa_Shah_{company}.pdf"

    generate_resume(
        profile=DEFAULT_PROFILE,
        skills=SKILLS_TEMPLATE,
        experience=selected_experience,
        projects=selected_projects,
        education=DEFAULT_EDUCATION,
        output_path=docx_path,
        company_name=request.company,
        role_name=request.role,
    )

    # Step 3 — Convert to PDF using LibreOffice
    subprocess.run([
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "--headless",
        "--convert-to", "pdf",
        "--outdir", "/tmp/jobos_resumes/",
        docx_path
    ], check=True)

    # Step 4 — Return PDF
    return FileResponse(
        path=pdf_path,
        filename=f"Vishwaa_Shah_{company}.pdf",
        media_type="application/pdf"
    )
