from __future__ import annotations

from pydantic import BaseModel


class TriageRequest(BaseModel):
    symptoms_text: str


class Citation(BaseModel):
    title: str
    url: str


class Claim(BaseModel):
    """Anti-hallucination contract — every factual field must declare its source."""
    field: str
    source: str   # "db" | "tool" | "fallback" | "unavailable"
    value: str


class TriageResponse(BaseModel):
    specialty: str
    urgency: str
    confidence: float
    rationale: str
    citations: list[Citation] = []
    claims: list[Claim] = []   # anti-hallucination: source of each field

