from __future__ import annotations

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Hospital output schemas
# ---------------------------------------------------------------------------

class SpecialtyOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class HospitalOut(BaseModel):
    id: int
    name: str
    address: str
    phone: str | None
    lat: float
    lng: float
    is_24x7: bool
    status: str
    icu_total: int
    icu_available: int
    general_total: int
    general_available: int
    ventilators_available: int
    specialties: list[str] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Specialty CRUD schemas
# ---------------------------------------------------------------------------

class SpecialtyCreate(BaseModel):
    name: str


# ---------------------------------------------------------------------------
# Recommendation request / response
# ---------------------------------------------------------------------------

class RecommendationRequest(BaseModel):
    specialty: str
    urgency: str          # "normal" | "urgent" | "emergency"
    lat: float
    lng: float
    radius_km: float = 50.0


class ScoreBreakdown(BaseModel):
    travel_score: float
    specialty_score: float
    bed_score: float
    ventilator_score: float
    total: float


class HospitalRecommendation(BaseModel):
    hospital: HospitalOut
    distance_km: float
    eta_minutes: float | None
    score_breakdown: ScoreBreakdown


class RecommendationResult(BaseModel):
    """
    Single hospital recommendation with doctor info.
    Anti-hallucination: doctor.room is None if no active room assignment exists.
    claims array declares the source of every factual field.
    """
    hospital: HospitalOut
    distance_km: float
    eta_minutes: float | None
    score_breakdown: ScoreBreakdown
    doctors: list = []   # list[DoctorOut]
    claims: list = []    # list[Claim] — source of hospital/doctor data


class RecommendationResponse(BaseModel):
    results: list[RecommendationResult]
