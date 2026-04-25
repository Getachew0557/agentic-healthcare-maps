from __future__ import annotations

from fastapi import APIRouter

from app.schemas.patient import TriageRequest, TriageResponse
from app.services.triage import triage_with_citations

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def triage(payload: TriageRequest) -> TriageResponse:
    return await triage_with_citations(payload.symptoms_text)

