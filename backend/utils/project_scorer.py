def score_project(project: dict, extracted_skills: list, team_focus: str = "") -> int:
    """
    Score a project against JD requirements.
    Higher score = better match for this job.
    """
    score = 0
    
    # 1. Stack overlap — 8 points per matching skill
    project_stack = set(s.lower() for s in project.get("stack", []))
    jd_skills = set(s.lower() for s in extracted_skills)
    
    matching_stack = project_stack & jd_skills
    score += len(matching_stack) * 8
    
    # 2. Live project bonus — 20 points
    if project.get("is_live"):
        score += 20
    
    # 3. Team focus keyword match — 10 points
    if team_focus:
        focus_words = team_focus.lower().split()
        project_text = (project.get("name", "") + " " + project.get("description", "")).lower()
        for word in focus_words:
            if len(word) > 4 and word in project_text:
                score += 10
                break
    
    return score


def select_projects(projects: list, extracted_skills: list, team_focus: str = "", max_projects: int = 3) -> dict:
    """
    Score all projects and return the best matches.
    """
    if not projects:
        return {"selected": [], "scores": {}, "warning": "No projects in profile"}
    
    # Score each project
    scored = []
    for project in projects:
        s = score_project(project, extracted_skills, team_focus)
        scored.append({**project, "score": s})
    
    # Sort by score
    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:max_projects]
    
    # Warning if best score is low
    warning = None
    if scored[0]["score"] < 20:
        warning = f"No strong project match found. Consider building a project with: {', '.join(extracted_skills[:3])}"
    
    return {
        "selected": top,
        "scores": {p["name"]: p["score"] for p in scored},
        "warning": warning
    }
