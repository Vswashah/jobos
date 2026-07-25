"""
Uses an LLM (via litellm, defaulting to Groq) to turn a candidate email into
structured interview details — or to say it isn't actually an interview at all.
"""
import json
import os
import litellm

GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/llama-3.3-70b-versatile")

EXTRACTION_PROMPT = """You are extracting interview scheduling details from an email. \
Respond with ONLY a JSON object, no other text, matching this exact shape:

{{
  "is_interview": boolean,
  "company": string or null,
  "round": integer or null,
  "format": string or null,
  "interview_date": string or null,
  "interviewer_name": string or null
}}

Field notes:
- is_interview: false if this email is not actually about a scheduled interview
  (e.g. a job alert, newsletter, application-received confirmation with no
  interview yet, or a rejection).
- format: one of "phone", "video", "onsite", "technical", "other".
- interview_date: ISO 8601 datetime (e.g. "2026-08-04T14:00:00") if a specific
  date/time is mentioned, else null. Resolve relative dates ("next Tuesday")
  using the email's own date as the reference point.
- company: the hiring company's name, inferred from context if not stated
  explicitly.

Email subject: {subject}
Email from: {sender}
Email date: {date}
Email body:
{body}
"""


def extract_interview_details(subject: str, sender: str, date: str, body: str) -> dict:
    prompt = EXTRACTION_PROMPT.format(subject=subject, sender=sender, date=date, body=body)
    try:
        response = litellm.completion(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
        )
        content = response["choices"][0]["message"]["content"]
        data = json.loads(content)
    except Exception:
        # Best-effort pipeline over a batch of emails — one bad response
        # (LLM error, malformed JSON, ...) shouldn't abort the whole sync.
        return {"is_interview": False}

    if not isinstance(data, dict):
        return {"is_interview": False}
    return data
