from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.skill_extractor import extract_skills

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

class JDRequest(BaseModel):
    jd_text: str

@app.get("/")
async def root():
    return {"message": "JobOS API running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/resumes/analyze")
async def analyze_jd(request: JDRequest):
    """
    Paste a job description and get back extracted skills.
    """
    skills = extract_skills(request.jd_text)
    return {
        "jd_received": True,
        "extracted_skills": skills,
        "message": f"Found {skills['total_found']} skills in this JD"
    }
