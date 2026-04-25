from __future__ import annotations

from pydantic import BaseModel


class TriageRequest(BaseModel):
    symptoms_text: str


class Citation(BaseModel):
    title: str
    url: str


class TriageResponse(BaseModel):
    specialty: str
    urgency: str
    citations: list[Citation] = []

