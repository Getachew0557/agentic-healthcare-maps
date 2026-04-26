from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from app.core.config import settings


async def gemini_triage(symptoms_text: str) -> dict[str, Any]:
    """
    Calls Gemini via the official google-genai SDK.

    Uses the exact format from the official documentation:
        from google import genai
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents="...",
        )

    Returns a dict shaped like:
        { specialty: str, urgency: str, confidence: float, rationale: str }

    Anti-hallucination policy:
    - JSON-only output enforced via prompt.
    - If parsing fails, caller falls back deterministically.
    """
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    # The SDK reads GOOGLE_API_KEY from the environment automatically.
    os.environ["GOOGLE_API_KEY"] = settings.gemini_api_key

    from google import genai

    client = genai.Client()

    prompt = (
        "You are a medical triage assistant for decision-support only. "
        "Do NOT diagnose. Output must be valid JSON only.\n\n"
        "Extract the required medical specialty and urgency from patient symptoms.\n\n"
        "Rules:\n"
        "- Output JSON only.\n"
        '- urgency must be one of: "normal" | "urgent" | "emergency"\n'
        "- specialty must be a short snake_case string "
        "(examples: cardiology, neurology, emergency, general_medicine, pediatrics)\n"
        "- confidence must be 0..1\n"
        "- rationale must be <= 20 words, no medical diagnosis claims.\n\n"
        f"Symptoms:\n{symptoms_text}\n\n"
        'Return JSON:\n{"specialty":"...", "urgency":"...", "confidence":0.0, "rationale":"..."}'
    )

    def _call() -> str:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        return response.text

    text = await asyncio.to_thread(_call)

    if not text:
        raise RuntimeError("Gemini returned empty response")

    # Strip markdown code fences if present
    cleaned = text.strip()
    cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    return json.loads(cleaned)
