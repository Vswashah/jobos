def match_skills(extracted_skills: list, user_skills: list) -> dict:
    """
    Compare JD skills against user's skills.
    Returns matching and missing skills.
    """
    extracted_lower = set(s.lower() for s in extracted_skills)
    user_lower = set(s.lower() for s in user_skills)
    
    matching = list(extracted_lower & user_lower)
    missing = list(extracted_lower - user_lower)
    
    match_percentage = round(len(matching) / len(extracted_lower) * 100) if extracted_lower else 0
    
    return {
        "matching": sorted(matching),
        "missing": sorted(missing),
        "match_percentage": match_percentage,
        "summary": f"You have {len(matching)}/{len(extracted_lower)} required skills ({match_percentage}% match)"
    }
