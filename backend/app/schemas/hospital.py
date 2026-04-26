from __future__ import annotations

from pydantic import BaseModel, field_validator

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
# Hospital CRUD schemas (admin + hospital_staff self-service)
# ---------------------------------------------------------------------------


class HospitalCreate(BaseModel):
    name: str
    address: str = ""
    phone: str | None = None
    lat: float
    lng: float
    is_24x7: bool = True
    status: str = "normal"
    icu_total: int = 0
    icu_available: int = 0
    general_total: int = 0
    general_available: int = 0
    ventilators_available: int = 0
    specialties: list[str] = []

    @field_validator("status", mode="before")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"normal", "busy", "emergency_only"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class HospitalUpdate(BaseModel):
    """Hospital staff can update their own hospital's profile info."""

    name: str | None = None
    address: str | None = None
    phone: str | None = None
    lat: float | None = None
    lng: float | None = None
    is_24x7: bool | None = None
    status: str | None = None
    icu_total: int | None = None
    icu_available: int | None = None
    general_total: int | None = None
    general_available: int | None = None
    ventilators_available: int | None = None

    @field_validator("status", mode="before")
    @classmethod
    def valid_status(cls, v: str | None) -> str | None:
        if v is not None and v not in {"normal", "busy", "emergency_only"}:
            raise ValueError("status must be normal | busy | emergency_only")
        return v


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
    urgency: str  # "normal" | "urgent" | "emergency"
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
    doctors: list = []
    claims: list = []


class RecommendationResponse(BaseModel):
    results: list[RecommendationResult]
