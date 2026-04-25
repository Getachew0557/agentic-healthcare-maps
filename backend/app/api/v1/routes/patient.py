from __future__ import annotations

from fastapi import APIRouter

from app.schemas.patient import TriageRequest, TriageResponse

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
def triage(payload: TriageRequest) -> TriageResponse:
    # Starter implementation: returns a safe stub so frontend can integrate early.
    # Real logic should live in app/services/gemini.py and app/services/tavily.py.
    text = payload.symptoms_text.lower()
    specialty = "general_medicine"
    urgency = "normal"

    if "chest" in text or "सीने" in payload.symptoms_text:
        specialty = "cardiology"
        urgency = "emergency"

    return TriageResponse(specialty=specialty, urgency=urgency, citations=[])

