from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.routes.hospitals import _build_hospital_out
from app.db.session import get_db
from app.models.hospital import Hospital
from app.schemas.hospital import RecommendationRequest, RecommendationResponse
from app.schemas.patient import TriageRequest, TriageResponse
from app.services.ranking import rank_hospitals
from app.services.triage import triage_with_citations

router = APIRouter()


@router.post("/triage", response_model=TriageResponse)
async def triage(payload: TriageRequest) -> TriageResponse:
    return await triage_with_citations(payload.symptoms_text)


@router.post("/recommendations", response_model=RecommendationResponse)
async def recommendations(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    """
    Given a specialty + urgency + patient coordinates, return the top 3
    ranked hospitals with distance, ETA, and a transparent score breakdown.
    """
    # Load all hospitals from DB (SQLite/Postgres — fine for MVP scale)
    all_hospitals_orm = db.scalars(select(Hospital)).all()
    all_hospitals = [_build_hospital_out(h, db) for h in all_hospitals_orm]

    results = await rank_hospitals(
        hospitals=all_hospitals,
        specialty=payload.specialty,
        urgency=payload.urgency,
        patient_lat=payload.lat,
        patient_lng=payload.lng,
        radius_km=payload.radius_km,
        top_n=3,
    )

    return RecommendationResponse(results=results)

