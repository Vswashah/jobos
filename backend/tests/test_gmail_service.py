"""
Unit tests for gmail_service's pure parsing helpers — no network calls,
no real Gmail/Google credentials needed.
"""
import base64
from services import gmail_service


def _b64(text: str) -> str:
    return base64.urlsafe_b64encode(text.encode()).decode().rstrip("=")


def test_extract_body_text_simple_plain_message():
    payload = {
        "mimeType": "text/plain",
        "body": {"data": _b64("Hello, let's schedule your interview.")},
    }
    assert gmail_service.extract_body_text(payload) == "Hello, let's schedule your interview."


def test_extract_body_text_multipart_prefers_plain_text():
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/html", "body": {"data": _b64("<p>HTML version</p>")}},
            {"mimeType": "text/plain", "body": {"data": _b64("Plain text version")}},
        ],
    }
    assert gmail_service.extract_body_text(payload) == "Plain text version"


def test_extract_body_text_nested_parts():
    payload = {
        "mimeType": "multipart/mixed",
        "parts": [
            {
                "mimeType": "multipart/alternative",
                "parts": [
                    {"mimeType": "text/plain", "body": {"data": _b64("Nested plain text")}},
                ],
            }
        ],
    }
    assert gmail_service.extract_body_text(payload) == "Nested plain text"


def test_extract_body_text_no_plain_part_returns_empty():
    payload = {"mimeType": "text/html", "body": {"data": _b64("<p>Only HTML</p>")}}
    assert gmail_service.extract_body_text(payload) == ""


def test_parse_message_extracts_headers_and_body():
    raw = {
        "id": "msg123",
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "Subject", "value": "Interview Invitation"},
                {"name": "From", "value": "Jane Recruiter <jane@acme.com>"},
                {"name": "Date", "value": "Mon, 1 Jan 2026 10:00:00 -0600"},
            ],
            "body": {"data": _b64("We'd like to schedule your interview.")},
        },
    }
    parsed = gmail_service.parse_message(raw)
    assert parsed["id"] == "msg123"
    assert parsed["subject"] == "Interview Invitation"
    assert parsed["from"] == "Jane Recruiter <jane@acme.com>"
    assert parsed["body_text"] == "We'd like to schedule your interview."


def test_parse_message_caps_body_length():
    long_body = "x" * 10000
    raw = {
        "id": "msg456",
        "payload": {
            "mimeType": "text/plain",
            "headers": [],
            "body": {"data": _b64(long_body)},
        },
    }
    parsed = gmail_service.parse_message(raw)
    assert len(parsed["body_text"]) == 4000


def test_guess_company_from_sender_extracts_domain():
    assert gmail_service.guess_company_from_sender("jane@acme.com") == "Acme"
    assert gmail_service.guess_company_from_sender("Jane Doe <jane@rivian.com>") == "Rivian"


def test_guess_company_from_sender_ignores_generic_domains():
    assert gmail_service.guess_company_from_sender("someone@gmail.com") is None
    assert gmail_service.guess_company_from_sender("no-reply@greenhouse.io") is None


def test_guess_company_from_sender_no_at_sign_returns_none():
    assert gmail_service.guess_company_from_sender("not-an-email") is None


def test_authorization_url_contains_required_params(monkeypatch):
    monkeypatch.setattr(gmail_service, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(gmail_service, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/gmail/callback")
    url = gmail_service.get_authorization_url(state="xyz")
    assert "client_id=test-client-id" in url
    assert "access_type=offline" in url
    assert "prompt=consent" in url
    assert "gmail.readonly" in url
