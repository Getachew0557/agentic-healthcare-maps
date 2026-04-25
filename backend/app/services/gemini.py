from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings


async def gemini_triage(symptoms_text: str) -> dict[str, Any]:
    """
    Calls Gemini via REST (no extra SDK dependency).
    Returns a dict shaped like:
      { specialty: str, urgency: str, confidence: float, rationale: str }

    Anti-hallucination policy:
    - We only accept JSON output (strict parse).
    - If parsing fails, caller must fallback deterministically.
    """
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    # Gemini Generative Language API endpoint (v1beta).
    # Note: this is a lightweight implementation; if Google changes the API, adjust here.
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash:generateContent"
    )

    system = (
        "You are a medical triage assistant for decision-support only. "
        "Do NOT diagnose. Output must be valid JSON only."
    )
    prompt = f"""
Extract the required medical specialty and urgency from patient symptoms.

Rules:
- Output JSON only.
- urgency must be one of: "normal" | "urgent" | "emergency"
- specialty must be a short snake_case string (examples: cardiology, neurology, emergency, general_medicine, pediatrics)
- confidence must be 0..1
- rationale must be <= 20 words, no medical diagnosis claims.

Symptoms:
{symptoms_text}

Return JSON:
{{"specialty":"...", "urgency":"...", "confidence":0.0, "rationale":"..."}}
""".strip()

    body = {
        "contents": [
            {"role": "user", "parts": [{"text": system + "\n\n" + prompt}]},
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
        },
    }

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(url, params={"key": settings.gemini_api_key}, json=body)
        res.raise_for_status()
        data = res.json()

    # Extract text from candidates
    text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise RuntimeError("Gemini returned empty response")

    # Some models wrap JSON in fences; strip common wrappers.
    cleaned = text.strip()
    cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    parsed = json.loads(cleaned)
    return parsed

