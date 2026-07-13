"""
Tests for skill_extractor.py
Learn: pytest basics, assert statements, test naming conventions
"""
import sys
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.skill_extractor import extract_skills

# ─── BASIC EXTRACTION TESTS ───────────────────────────────────────────────────

def test_extracts_python():
    """Python should be found in JD"""
    jd = "We need a Python developer"
    result = extract_skills(jd)
    assert "python" in result["all_skills"]

def test_extracts_multiple_skills():
    """Multiple skills should all be extracted"""
    jd = "Required: Python, React, PostgreSQL, Docker, Kafka"
    result = extract_skills(jd)
    assert "python" in result["all_skills"]
    assert "react" in result["all_skills"]
    assert "postgresql" in result["all_skills"]
    assert "docker" in result["all_skills"]
    assert "kafka" in result["all_skills"]

def test_case_insensitive():
    """Skill matching should work regardless of case"""
    jd = "Experience with PYTHON, REACT, and DOCKER required"
    result = extract_skills(jd)
    assert "python" in result["all_skills"]
    assert "react" in result["all_skills"]
    assert "docker" in result["all_skills"]

def test_returns_correct_structure():
    """Result should always have these keys"""
    jd = "Python developer needed"
    result = extract_skills(jd)
    assert "by_category" in result
    assert "all_skills" in result
    assert "total_found" in result

def test_total_found_matches_all_skills_length():
    """total_found should equal len(all_skills)"""
    jd = "Python, React, Docker, Kafka, Redis"
    result = extract_skills(jd)
    assert result["total_found"] == len(result["all_skills"])

def test_skills_grouped_by_category():
    """Skills should be grouped correctly"""
    jd = "Python developer with Docker and PostgreSQL experience"
    result = extract_skills(jd)
    categories = result["by_category"]
    # Python is a language
    if "languages" in categories:
        assert "python" in categories["languages"]
    # Docker is cloud
    if "cloud" in categories:
        assert "docker" in categories["cloud"]
    # PostgreSQL is a database
    if "databases" in categories:
        assert "postgresql" in categories["databases"]

def test_no_false_positives():
    """Should not extract skills from unrelated text"""
    jd = "We are looking for someone with great communication skills"
    result = extract_skills(jd)
    # 'r' language shouldn't match
    assert "r" not in result["all_skills"]

def test_empty_jd():
    """Empty JD should return empty results"""
    result = extract_skills("")
    assert result["total_found"] == 0
    assert result["all_skills"] == []

def test_no_skills_in_jd():
    """JD with no tech skills should return empty"""
    jd = "We are hiring a marketing manager with great leadership abilities"
    result = extract_skills(jd)
    assert result["total_found"] == 0

def test_rivian_jd():
    """Full Rivian JD should extract all expected skills"""
    jd = """
    Software Engineering Intern at Rivian. We are looking for a Python developer 
    with experience in Kafka, Redis, AWS, Docker, and Kubernetes. Knowledge of Go 
    is a plus. Experience with PostgreSQL and monitoring tools like Prometheus and 
    Grafana preferred.
    """
    result = extract_skills(jd)
    expected = ["python", "go", "kafka", "redis", "aws", "docker", 
                "kubernetes", "postgresql", "prometheus", "grafana"]
    for skill in expected:
        assert skill in result["all_skills"], f"Expected '{skill}' to be extracted"
    assert result["total_found"] == 10
