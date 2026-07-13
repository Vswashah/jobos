import re

KNOWN_SKILLS = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
        "kotlin", "swift", "ruby", "php", "scala", "bash", "sql"
    ],
    "frameworks": [
        "react", "next.js", "vue", "angular", "fastapi", "flask", "django",
        "express", "nestjs", "spring"
    ],
    "databases": [
        "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
        "dynamodb", "sqlite"
    ],
    "cloud": [
        "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
        "github actions", "jenkins"
    ],
    "tools": [
        "kafka", "rabbitmq", "prometheus", "grafana", "nginx", "graphql"
    ]
}

def extract_skills(jd_text: str) -> dict:
    text_lower = jd_text.lower()
    found = {}
    
    for category, skills in KNOWN_SKILLS.items():
        matches = []
        for skill in skills:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                matches.append(skill)
        if matches:
            found[category] = matches
    
    all_skills = [s for skills in found.values() for s in skills]
    
    return {
        "by_category": found,
        "all_skills": all_skills,
        "total_found": len(all_skills)
    }
