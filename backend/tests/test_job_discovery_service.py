"""
Unit tests for job_discovery_service — outbound httpx calls to xAI are
mocked so these run without a real XAI_API_KEY or network access.
"""
import json
import httpx
import pytest
from services import job_discovery_service


class FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def json(self):
        return self._json_data


def _patch_post(monkeypatch, response):
    async def fake_post(self, url, headers=None, json=None):
        return response
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)


POSTING = {
    "company": "Acme",
    "role": "Software Engineering Intern",
    "location": "Remote",
    "remote_type": "remote",
    "source_url": "https://acme.com/careers/123",
    "jd_summary": "Build things.",
    "required_skills": ["python", "aws"],
    "h1b_sponsor": True,
    "f1_eligible": True,
    "deadline": None,
}


@pytest.mark.asyncio
async def test_discover_jobs_parses_output_text(monkeypatch):
    _patch_post(monkeypatch, FakeResponse({"output_text": json.dumps([POSTING])}))
    results = await job_discovery_service.discover_jobs(["python"], "2026-05-01")
    assert results == [POSTING]


@pytest.mark.asyncio
async def test_discover_jobs_falls_back_to_output_content_blocks(monkeypatch):
    payload = {
        "output": [
            {"content": [{"type": "output_text", "text": json.dumps([POSTING])}]}
        ]
    }
    _patch_post(monkeypatch, FakeResponse(payload))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == [POSTING]


@pytest.mark.asyncio
async def test_discover_jobs_falls_back_to_chat_completions_shape(monkeypatch):
    payload = {"choices": [{"message": {"content": json.dumps([POSTING])}}]}
    _patch_post(monkeypatch, FakeResponse(payload))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == [POSTING]


@pytest.mark.asyncio
async def test_discover_jobs_strips_code_fence(monkeypatch):
    fenced = "```json\n" + json.dumps([POSTING]) + "\n```"
    _patch_post(monkeypatch, FakeResponse({"output_text": fenced}))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == [POSTING]


@pytest.mark.asyncio
async def test_discover_jobs_filters_incomplete_postings(monkeypatch):
    incomplete = {"company": "NoUrlCo"}  # missing source_url
    _patch_post(monkeypatch, FakeResponse({"output_text": json.dumps([POSTING, incomplete])}))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == [POSTING]


@pytest.mark.asyncio
async def test_discover_jobs_malformed_json_degrades_gracefully(monkeypatch):
    _patch_post(monkeypatch, FakeResponse({"output_text": "not valid json"}))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == []


@pytest.mark.asyncio
async def test_discover_jobs_non_list_json_degrades_gracefully(monkeypatch):
    _patch_post(monkeypatch, FakeResponse({"output_text": json.dumps({"not": "a list"})}))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == []


@pytest.mark.asyncio
async def test_discover_jobs_http_error_degrades_gracefully(monkeypatch):
    async def raise_error(self, url, headers=None, json=None):
        raise httpx.ConnectError("simulated network failure")

    monkeypatch.setattr(httpx.AsyncClient, "post", raise_error)
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == []


@pytest.mark.asyncio
async def test_discover_jobs_http_status_error_degrades_gracefully(monkeypatch):
    _patch_post(monkeypatch, FakeResponse({}, status_code=500))
    results = await job_discovery_service.discover_jobs(["python"], None)
    assert results == []
