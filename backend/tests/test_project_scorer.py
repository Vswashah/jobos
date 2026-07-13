"""
Tests for project_scorer.py
Learn: fixtures, edge cases, scoring algorithm validation
"""
import sys
sys.path.append("/Users/vishwaashah/jobos/backend")
from utils.project_scorer import score_project, select_projects

# ─── FIXTURES (reusable test data) ────────────────────────────────────────────

TELEMETRY_PROJECT = {
    "name": "Fleet Telemetry Pipeline",
    "description": "Real-time vehicle telemetry pipeline",
    "stack": ["Python", "Go", "Kafka", "Redis", "PostgreSQL", "Prometheus", "AWS"],
    "is_live": False,
}

TRACKLY_PROJECT = {
    "name": "Trackly",
    "description": "Full-stack AI project tracking platform",
    "stack": ["React", "TypeScript", "Node.js", "PostgreSQL", "LangChain"],
    "is_live": True,
}

PHANTOM_PROJECT = {
    "name": "Phantom",
    "description": "Multi-agent AI debate system",
    "stack": ["Python", "LangGraph", "LiteLLM", "FastAPI"],
    "is_live": False,
}

RIVIAN_SKILLS = ["python", "kafka", "redis", "aws", "docker", 
                  "kubernetes", "postgresql", "prometheus", "grafana", "go"]

RIPPLING_SKILLS = ["react", "typescript", "node.js", "postgresql", "graphql"]

# ─── SCORE_PROJECT TESTS ──────────────────────────────────────────────────────

def test_telemetry_scores_high_for_rivian():
    """Telemetry pipeline should score high for distributed systems roles"""
    score = score_project(TELEMETRY_PROJECT, RIVIAN_SKILLS)
    assert score > 50, f"Expected score > 50 for telemetry vs Rivian, got {score}"

def test_trackly_scores_high_for_rippling():
    """Trackly should score high for fullstack roles"""
    score = score_project(TRACKLY_PROJECT, RIPPLING_SKILLS)
    assert score > 20, f"Expected score > 20 for Trackly vs Rippling, got {score}"

def test_live_project_scores_higher():
    """Live project should score 20 points higher than identical non-live project"""
    live = {**TRACKLY_PROJECT, "is_live": True}
    non_live = {**TRACKLY_PROJECT, "is_live": False}
    
    live_score = score_project(live, RIPPLING_SKILLS)
    non_live_score = score_project(non_live, RIPPLING_SKILLS)
    
    assert live_score - non_live_score == 20

def test_more_stack_overlap_means_higher_score():
    """Project with more matching skills should score higher"""
    good_match = {
        "name": "Good",
        "description": "test",
        "stack": ["python", "kafka", "redis", "aws"],  # 4 matches
        "is_live": False
    }
    poor_match = {
        "name": "Poor",
        "description": "test", 
        "stack": ["python"],  # 1 match
        "is_live": False
    }
    
    good_score = score_project(good_match, RIVIAN_SKILLS)
    poor_score = score_project(poor_match, RIVIAN_SKILLS)
    
    assert good_score > poor_score

def test_team_focus_adds_points():
    """Matching team focus keywords should add points"""
    score_with_focus = score_project(
        TELEMETRY_PROJECT, 
        RIVIAN_SKILLS,
        team_focus="vehicle telemetry pipeline"
    )
    score_without_focus = score_project(
        TELEMETRY_PROJECT,
        RIVIAN_SKILLS,
        team_focus=""
    )
    assert score_with_focus > score_without_focus

def test_empty_stack_scores_zero():
    """Project with no stack should score 0 (no live bonus either)"""
    empty_project = {
        "name": "Empty",
        "description": "no stack",
        "stack": [],
        "is_live": False
    }
    score = score_project(empty_project, RIVIAN_SKILLS)
    assert score == 0

def test_no_overlap_scores_zero_without_live():
    """Project with completely different stack, not live = 0"""
    unrelated = {
        "name": "Unrelated",
        "description": "marketing tool",
        "stack": ["php", "wordpress"],
        "is_live": False
    }
    score = score_project(unrelated, RIVIAN_SKILLS)
    assert score == 0

# ─── SELECT_PROJECTS TESTS ────────────────────────────────────────────────────

def test_selects_correct_number_of_projects():
    """Should return at most max_projects"""
    projects = [TELEMETRY_PROJECT, TRACKLY_PROJECT, PHANTOM_PROJECT]
    result = select_projects(projects, RIVIAN_SKILLS, max_projects=2)
    assert len(result["selected"]) <= 2

def test_telemetry_ranked_first_for_rivian():
    """Telemetry pipeline should be #1 for Rivian-type JD"""
    projects = [TRACKLY_PROJECT, PHANTOM_PROJECT, TELEMETRY_PROJECT]
    result = select_projects(projects, RIVIAN_SKILLS)
    assert result["selected"][0]["name"] == "Fleet Telemetry Pipeline"

def test_trackly_ranked_first_for_rippling():
    """Trackly should be #1 for fullstack roles"""
    projects = [TELEMETRY_PROJECT, PHANTOM_PROJECT, TRACKLY_PROJECT]
    result = select_projects(projects, RIPPLING_SKILLS)
    assert result["selected"][0]["name"] == "Trackly"

def test_scores_included_in_result():
    """Result should include scores for all projects"""
    projects = [TELEMETRY_PROJECT, TRACKLY_PROJECT]
    result = select_projects(projects, RIVIAN_SKILLS)
    assert "scores" in result
    assert "Fleet Telemetry Pipeline" in result["scores"]
    assert "Trackly" in result["scores"]

def test_empty_projects_returns_warning():
    """Empty project list should return warning"""
    result = select_projects([], RIVIAN_SKILLS)
    assert result["warning"] is not None
    assert result["selected"] == []

def test_no_warning_for_good_match():
    """Good match should not produce a warning"""
    projects = [TELEMETRY_PROJECT]
    result = select_projects(projects, RIVIAN_SKILLS)
    assert result["warning"] is None

def test_warning_for_poor_match():
    """Poor project match should produce a warning"""
    unrelated_project = {
        "name": "Unrelated",
        "description": "marketing tool",
        "stack": ["php"],
        "is_live": False
    }
    result = select_projects([unrelated_project], RIVIAN_SKILLS)
    assert result["warning"] is not None
