from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import sys
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.skill_extractor import extract_skills
from utils.skill_matcher import match_skills

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

# Your actual skills — we'll move this to DB later
YOUR_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "FastAPI", "Flask", "PostgreSQL", "MySQL", "Redis",
    "Docker", "Kubernetes", "AWS", "GitHub Actions", "Git",
    "LangChain", "LangGraph", "LiteLLM", "Kafka", "Prometheus",
    "Grafana", "Terraform", "Linux", "Bash", "SQL", "Go" 
]

class JDRequest(BaseModel):
    jd_text: str

class AnalyzeResponse(BaseModel):
    extracted_skills: dict
    skill_match: dict
    missing_skills: list
    message: str

@app.get("/")
async def root():
    return {"message": "JobOS API running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/resumes/analyze")
async def analyze_jd(request: JDRequest):
    """
    Step 1: Extract skills from JD
    Step 2: Compare against your skills
    Step 3: Return what matches and what's missing
    """
    # Step 1 — Extract skills from JD
    extracted = extract_skills(request.jd_text)
    
    # Step 2 — Compare against your skills
    match = match_skills(
        extracted_skills=extracted["all_skills"],
        user_skills=YOUR_SKILLS
    )
    
    # Step 3 — Build response
    return {
        "extracted_skills": extracted,
        "skill_match": match,
        "missing_skills": match["missing"],
        "message": match["summary"]
    }
