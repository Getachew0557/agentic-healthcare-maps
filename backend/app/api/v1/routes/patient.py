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


@router.post(
    "/triage",
    response_model=TriageResponse,
    summary="AI symptom triage",
    description="""
Describe symptoms in plain language (English, Hindi, or any language Gemini supports).

**What happens:**
1. Google Gemini extracts the required medical `specialty` and `urgency` level
2. Tavily searches PubMed / WHO / Mayo Clinic and returns citable `citations`
3. If API keys are missing, a deterministic fallback handles common patterns

**Urgency levels:** `normal` | `urgent` | `emergency`

**Common specialty values:** `cardiology`, `neurology`, `emergency`, `general_medicine`, `pediatrics`, `orthopedics`, `oncology`

> This is decision-support only — not a medical diagnosis.
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "specialty": "cardiology",
                        "urgency": "emergency",
                        "confidence": 0.78,
                        "rationale": "Symptoms suggest possible cardiac/respiratory emergency.",
                        "citations": [
                            {"title": "AHA Guidelines on Chest Pain", "url": "https://www.heart.org/..."}
                        ],
                    }
                }
            }
        }
    },
)
async def triage(payload: TriageRequest) -> TriageResponse:
    return await triage_with_citations(payload.symptoms_text)


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Get ranked hospital recommendations",
    description="""
Given a specialty, urgency level, and patient GPS coordinates, returns the **top 3 hospitals**
ranked by a weighted scoring formula.

**Scoring weights (emergency mode):**
| Component | Weight |
|---|---|
| Travel time | 55% |
| Specialty match | 25% |
| Bed availability | 15% |
| Ventilator availability | 5% |

Weights shift for `urgent` (40/35/20/5) and `normal` (30/40/25/5) urgency.

**ETA:** Provided by OpenRouteService if `ORS_API_KEY` is configured; otherwise `null`.

**Typical flow:** call `/triage` first, then pass `specialty` + `urgency` from that response here.
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "results": [
                            {
                                "hospital": {
                                    "id": 1,
                                    "name": "Kokilaben Dhirubhai Ambani Hospital",
                                    "address": "Andheri West, Mumbai",
                                    "phone": "+91-22-30999999",
                                    "lat": 19.1197,
                                    "lng": 72.8397,
                                    "is_24x7": True,
                                    "status": "normal",
                                    "icu_total": 60,
                                    "icu_available": 18,
                                    "general_total": 450,
                                    "general_available": 120,
                                    "ventilators_available": 12,
                                    "specialties": ["cardiology", "neurology", "emergency"],
                                },
                                "distance_km": 4.2,
                                "eta_minutes": 12.5,
                                "score_breakdown": {
                                    "travel_score": 0.87,
                                    "specialty_score": 1.0,
                                    "bed_score": 0.9,
                                    "ventilator_score": 1.0,
                                    "total": 0.934,
                                },
                            }
                        ]
                    }
                }
            }
        }
    },
)
async def recommendations(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
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
