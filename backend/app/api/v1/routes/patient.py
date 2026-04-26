from __future__ import annotations

import time

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.routes.hospitals import _build_hospital_out
from app.core.config import settings
from app.db.session import get_db
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital
from app.schemas.doctor import DoctorOut, RoomAssignmentOut
from app.schemas.hospital import RecommendationRequest, RecommendationResponse, RecommendationResult
from app.schemas.patient import TriageRequest, TriageResponse
from app.services.ranking import rank_hospitals
from app.services.triage import triage_with_citations

router = APIRouter()

_EMERGENCY_KEYWORDS = (
    "chest pain", "chest tightness", "difficulty breathing", "shortness of breath",
    "severe bleeding", "unconscious", "stroke", "heart attack", "not breathing",
    "सीने में दर्द", "सांस", "बेहोश",
)

_EMERGENCY_PREPEND = (
    "⚠️ EMERGENCY WARNING: These symptoms may require immediate emergency care. "
    "Call your local emergency services (911 / 112 / 108) immediately. "
    "This system provides decision-support only — it is not a substitute for emergency services."
)


def _has_emergency_keywords(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _EMERGENCY_KEYWORDS)


def _get_doctors_for_hospital(hospital_id: int, specialty: str, db: Session) -> list[DoctorOut]:
    """
    Return active doctors at a hospital matching the needed specialty.
    Anti-hallucination: room is None if no active assignment exists.
    """
    doctors = db.scalars(
        select(Doctor).where(
            Doctor.hospital_id == hospital_id,
            Doctor.is_active == True,  # noqa: E712
            Doctor.specialty.ilike(f"%{specialty.replace('_', ' ')}%"),
        )
    ).all()

    result: list[DoctorOut] = []
    for d in doctors:
        active_ra = db.scalar(
            select(DoctorRoomAssignment).where(
                DoctorRoomAssignment.doctor_id == d.id,
                DoctorRoomAssignment.is_active == True,  # noqa: E712
            )
        )
        room_out = (
            RoomAssignmentOut(
                id=active_ra.id,
                room_code=active_ra.room_code,
                room_type=active_ra.room_type,
                is_active=active_ra.is_active,
                valid_from=active_ra.valid_from,
                valid_to=active_ra.valid_to,
            )
            if active_ra
            else None
        )
        result.append(
            DoctorOut(
                id=d.id,
                hospital_id=d.hospital_id,
                name=d.name,
                specialty=d.specialty,
                phone=d.phone,
                is_active=d.is_active,
                room=room_out,
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
        )
    return result


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
4. Emergency keywords trigger a safety warning prepend
5. Every response includes a `claims` array declaring the source of each field

> This is decision-support only — not a medical diagnosis.
    """,
)
async def triage(
    payload: TriageRequest,
    db: Session = Depends(get_db),
) -> TriageResponse:
    import time
    from app.services.trace_logger import log_trace

    start = time.monotonic()
    result = await triage_with_citations(payload.symptoms_text)
    latency_ms = int((time.monotonic() - start) * 1000)

    emergency_triggered = _has_emergency_keywords(payload.symptoms_text)

    # Safety keyword pipeline — prepend emergency warning
    if emergency_triggered:
        result = TriageResponse(
            specialty=result.specialty,
            urgency="emergency",
            confidence=result.confidence,
            rationale=_EMERGENCY_PREPEND + " | " + result.rationale,
            citations=result.citations,
            claims=result.claims,
        )

    # Log agent trace for admin governance
    log_trace(
        tools_called={
            "gemini": bool(settings.gemini_api_key),
            "tavily": bool(settings.tavily_api_key),
            "fallback_used": not bool(settings.gemini_api_key),
        },
        final_answer_json={
            "specialty": result.specialty,
            "urgency": result.urgency,
            "confidence": result.confidence,
            "claims": [c.model_dump() for c in result.claims],
        },
        model="gemini-1.5-flash" if settings.gemini_api_key else "fallback",
        latency_ms=latency_ms,
        safety_flags={"emergency_keyword_triggered": emergency_triggered},
        db=db,
    )

    return result


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Get ranked hospital recommendations",
    description="""
Given a specialty, urgency level, and patient GPS coordinates, returns the **top 3 hospitals**
ranked by a weighted scoring formula with optional RAG re-ranking.

**Scoring weights (emergency mode):** travel 55%, specialty 25%, beds 15%, ventilators 5%.

**Doctor information:** Each hospital result includes matching doctors with room numbers
(when assigned). If no room is assigned, `room` is `null` — the AI never invents room numbers.

**Typical flow:** call `/triage` first, then pass `specialty` + `urgency` here.
    """,
)
async def recommendations(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    from app.services.vector.embeddings import rerank_by_similarity

    all_hospitals_orm = db.scalars(select(Hospital)).all()
    all_hospitals = [_build_hospital_out(h, db) for h in all_hospitals_orm]

    # Step 1: weighted ranking (geo + specialty + beds)
    results = await rank_hospitals(
        hospitals=all_hospitals,
        specialty=payload.specialty,
        urgency=payload.urgency,
        patient_lat=payload.lat,
        patient_lng=payload.lng,
        radius_km=payload.radius_km,
        top_n=10,  # get wider pool for RAG re-rank
    )

    # Step 2: RAG re-rank within the candidate pool
    if results:
        candidate_ids = [r.hospital.id for r in results]
        query = f"{payload.specialty.replace('_', ' ')} hospital near me urgency {payload.urgency}"
        reranked_ids = rerank_by_similarity(
            query_text=query,
            candidate_ids=candidate_ids,
            top_n=3,
        )
        # Reorder results by RAG ranking
        id_to_result = {r.hospital.id: r for r in results}
        results = [id_to_result[rid] for rid in reranked_ids if rid in id_to_result]

    # Step 3: attach doctor info (anti-hallucination: room from DB only)
    final_results = []
    for r in results[:3]:
        doctors = _get_doctors_for_hospital(r.hospital.id, payload.specialty, db)
        # Anti-hallucination claims for this result
        claims = [
            {"field": "hospital_name", "source": "db", "value": r.hospital.name},
            {"field": "distance_km", "source": "tool", "value": str(r.distance_km)},
            {"field": "eta_minutes", "source": "ors" if r.eta_minutes else "unavailable",
             "value": str(r.eta_minutes) if r.eta_minutes else "not available"},
            {"field": "icu_available", "source": "db", "value": str(r.hospital.icu_available)},
            {"field": "doctors_count", "source": "db", "value": str(len(doctors))},
        ]
        # Add room claims for each doctor
        for d in doctors:
            if d.room:
                claims.append({"field": f"doctor_{d.id}_room", "source": "db", "value": d.room.room_code})
            else:
                claims.append({"field": f"doctor_{d.id}_room", "source": "unavailable",
                               "value": f"Room not on file. Call {r.hospital.phone or 'hospital'} to confirm."})

        final_results.append(
            RecommendationResult(
                hospital=r.hospital,
                distance_km=r.distance_km,
                eta_minutes=r.eta_minutes,
                score_breakdown=r.score_breakdown,
                doctors=doctors,
                claims=claims,
            )
        )

    return RecommendationResponse(results=final_results)
