"""
Job discovery — uses xAI's Grok API with the web_search tool to find real,
currently-open internship/new-grad postings that are F1/OPT visa friendly.

Calls httpx directly against the Responses API rather than going through
litellm: xAI's web_search tool is a newer, still-shifting surface, so this
follows the same convention as gmail_service.py (hand-rolled httpx for
anything outside litellm's well-trodden chat-completions path).
"""
import json
import os
import httpx

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-4-fast")
XAI_RESPONSES_URL = "https://api.x.ai/v1/responses"

DISCOVERY_PROMPT = """Search the web for current, real, actively-open software \
engineering internship and new-grad job postings that are F1/OPT visa \
friendly (the posting either explicitly welcomes OPT/CPT/F1 candidates, or \
the company is a known H1B sponsor with no US-citizenship/security-clearance \
requirement). Prioritize roles matching these skills: {skills}. \
{grad_context}

Return ONLY a JSON array (no other text), each item shaped exactly like:
{{
  "company": string,
  "role": string,
  "location": string or null,
  "remote_type": "remote" | "hybrid" | "onsite" | null,
  "source_url": string,
  "jd_summary": string,
  "required_skills": [string],
  "h1b_sponsor": boolean or null,
  "f1_eligible": boolean,
  "deadline": string or null
}}

Only include postings you found real evidence for via search — do not \
invent listings. Return at most 15 results."""


async def discover_jobs(skills: list, graduation_date: str | None) -> list:
    """Calls Grok's web_search tool, returns a list of posting dicts (possibly empty)."""
    grad_context = f"The candidate graduates {graduation_date}." if graduation_date else ""
    prompt = DISCOVERY_PROMPT.format(
        skills=", ".join(skills[:15]) or "software engineering",
        grad_context=grad_context,
    )

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                XAI_RESPONSES_URL,
                headers={"Authorization": f"Bearer {XAI_API_KEY}"},
                json={
                    "model": XAI_MODEL,
                    "input": [{"role": "user", "content": prompt}],
                    "tools": [{"type": "web_search"}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, json.JSONDecodeError):
        # Best-effort discovery run — a network/API failure shouldn't 500 the request.
        return []

    text = _extract_output_text(data)
    try:
        results = json.loads(_strip_code_fence(text))
    except (json.JSONDecodeError, TypeError):
        return []
    if not isinstance(results, list):
        return []
    return [r for r in results if isinstance(r, dict) and r.get("company") and r.get("source_url")]


def _extract_output_text(data: dict) -> str:
    """Handles a few possible Responses-API-shaped payloads, since xAI's
    exact shape for tool-using responses has been shifting."""
    if isinstance(data.get("output_text"), str):
        return data["output_text"]

    for item in data.get("output", []) or []:
        for block in item.get("content", []) or []:
            if isinstance(block.get("text"), str):
                return block["text"]

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return ""


def _strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1]
        if stripped.endswith("```"):
            stripped = stripped.rsplit("```", 1)[0]
    return stripped.strip()
