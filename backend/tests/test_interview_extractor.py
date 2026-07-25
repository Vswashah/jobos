"""
Unit tests for interview_extractor — litellm.completion is mocked so these
run without a real Groq API key or network access.
"""
import json
from services import interview_extractor


class FakeResponse(dict):
    """litellm responses support both dict-style and attribute-style access."""
    def __init__(self, content):
        super().__init__(choices=[{"message": {"content": content}}])


def test_extracts_valid_interview_details(monkeypatch):
    payload = {
        "is_interview": True,
        "company": "Acme",
        "round": 2,
        "format": "video",
        "interview_date": "2026-08-05T14:00:00",
        "interviewer_name": "Jane Doe",
    }
    monkeypatch.setattr(
        interview_extractor.litellm, "completion",
        lambda **kwargs: FakeResponse(json.dumps(payload)),
    )
    result = interview_extractor.extract_interview_details(
        subject="Interview Invitation", sender="jane@acme.com",
        date="Mon, 1 Jan 2026", body="We'd like to schedule your interview.",
    )
    assert result == payload


def test_non_interview_email_returns_false(monkeypatch):
    payload = {"is_interview": False}
    monkeypatch.setattr(
        interview_extractor.litellm, "completion",
        lambda **kwargs: FakeResponse(json.dumps(payload)),
    )
    result = interview_extractor.extract_interview_details(
        subject="Weekly Newsletter", sender="news@acme.com",
        date="Mon, 1 Jan 2026", body="Check out our latest blog posts.",
    )
    assert result["is_interview"] is False


def test_malformed_json_response_degrades_gracefully(monkeypatch):
    monkeypatch.setattr(
        interview_extractor.litellm, "completion",
        lambda **kwargs: FakeResponse("not valid json"),
    )
    result = interview_extractor.extract_interview_details(
        subject="x", sender="x", date="x", body="x",
    )
    assert result == {"is_interview": False}


def test_llm_error_degrades_gracefully(monkeypatch):
    def raise_error(**kwargs):
        raise RuntimeError("simulated API failure")

    monkeypatch.setattr(interview_extractor.litellm, "completion", raise_error)
    result = interview_extractor.extract_interview_details(
        subject="x", sender="x", date="x", body="x",
    )
    assert result == {"is_interview": False}


def test_non_dict_json_degrades_gracefully(monkeypatch):
    monkeypatch.setattr(
        interview_extractor.litellm, "completion",
        lambda **kwargs: FakeResponse(json.dumps(["not", "a", "dict"])),
    )
    result = interview_extractor.extract_interview_details(
        subject="x", sender="x", date="x", body="x",
    )
    assert result == {"is_interview": False}
