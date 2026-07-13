from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.skill_extractor import extract_skills
from utils.skill_matcher import match_skills
from utils.project_scorer import select_projects

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

# Your skills
YOUR_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "FastAPI", "Flask", "PostgreSQL", "MySQL", "Redis",
    "Docker", "Kubernetes", "AWS", "GitHub Actions", "Git",
    "LangChain", "LangGraph", "LiteLLM", "Kafka", "Prometheus",
    "Grafana", "Terraform", "Linux", "Bash", "SQL", "Go"
]

# Your projects
YOUR_PROJECTS = [
    {
        "name": "Fleet Telemetry Pipeline",
        "description": "Real-time vehicle telemetry pipeline processing 10K+ events/day",
        "stack": ["Python", "Go", "Kafka", "Redis", "PostgreSQL", "Prometheus", "Grafana", "AWS", "Docker", "Kubernetes"],
        "is_live": False,
        "github_url": "github.com/Vswashah/fleet-telemetry",
        "highlights": [
            "Built distributed pipeline processing 10K+ events/day with 99% uptime",
            "Kafka + Redis + PostgreSQL with full observability via Prometheus and Grafana"
        ]
    },
    {
        "name": "Trackly",
        "description": "Full-stack AI project tracking platform with RAG pipeline",
        "stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "LangChain", "pgvector", "Docker", "AWS"],
        "is_live": True,
        "live_url": "trackly-eta-flame.vercel.app",
        "highlights": [
            "Shipped production SaaS with real users — React, Node.js, LangChain RAG",
            "AI-powered duplicate detection reducing entries 40%"
        ]
    },
    {
        "name": "Phantom",
        "description": "Multi-agent AI debate system using LangGraph and LiteLLM",
        "stack": ["Python", "LangGraph", "LiteLLM", "FastAPI", "pgvector", "Docker"],
        "is_live": False,
        "github_url": "github.com/Vswashah/phantom",
        "highlights": [
            "Built multi-agent system in 2 weeks using LangGraph and LiteLLM",
            "Real-time web search tool calling with FastAPI backend"
        ]
    },
    {
        "name": "AEGIS Platform",
        "description": "AI-powered IT and security compliance platform",
        "stack": ["Python", "React", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        "is_live": False,
        "highlights": [
            "Co-founded startup, top 20/181 teams at Draper Pitch Competition",
            "Selected for CometX Accelerator with Harvard Business School Foundry"
        ]
    }
]

class JDRequest(BaseModel):
    jd_text: str
    team_focus: Optional[str] = ""

@app.get("/")
async def root():
    return {"message": "JobOS API running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/resumes/analyze")
async def analyze_jd(request: JDRequest):
    """
    Full JD analysis:
    1. Extract skills from JD
    2. Compare against your skills
    3. Select best projects for this role
    """
    # Step 1 — Extract skills
    extracted = extract_skills(request.jd_text)
    
    # Step 2 — Match skills
    match = match_skills(
        extracted_skills=extracted["all_skills"],
        user_skills=YOUR_SKILLS
    )
    
    # Step 3 — Select best projects
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
