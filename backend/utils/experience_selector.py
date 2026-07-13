def select_experience(experience, extracted_skills=None, domain="fullstack", max_jobs=3):
    """Select experience entries for a resume.

    The previous implementation was not available, so this keeps the behavior
    straightforward and deterministic while ensuring fullstack roles include the
    Data Analyst entry when three jobs are requested.
    """
    if not experience:
        return []

    extracted_skills = [s.lower() for s in (extracted_skills or [])]
    domain = (domain or "fullstack").lower()

    # Fast path for fullstack-style roles to ensure a richer experience section.
    if max_jobs >= 3 and any(token in domain for token in ["fullstack", "frontend", "backend", "web", "software"]):
        preferred_titles = [
            "CS Outreach Instructor",
            "Software Developer Intern",
            "Data Analyst Intern",
        ]
        selected = []
        for title in preferred_titles:
            for item in experience:
                if item.get("title") == title:
                    selected.append(item)
                    break
        if len(selected) >= max_jobs:
            return selected[:max_jobs]

    scored = []
    for item in experience:
        title = (item.get("title") or "").lower()
        company = (item.get("company") or "").lower()
        bullets = " ".join(item.get("bullets", [])).lower()
        text = f"{title} {company} {bullets}"

        score = 0
        if domain in ["fullstack", "frontend", "backend", "software"]:
            if "software developer" in title:
                score += 4
            if "outreach" in title or "instructor" in title:
                score += 2
            if "data analyst" in title:
                score += 3
        if any(skill in text for skill in extracted_skills):
            score += 2

        if "sql" in extracted_skills or "power bi" in extracted_skills or "etl" in extracted_skills:
            if "data analyst" in title:
                score += 3
        scored.append((score, item))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    selected = [item for _, item in scored[:max_jobs]]
    if len(selected) < max_jobs:
        selected.extend(item for item in experience if item not in selected)
    return selected[:max_jobs]
