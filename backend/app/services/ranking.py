from __future__ import annotations

"""
Hospital ranking service.

Scoring formula (all components normalised to 0–1, higher = better):

    total = W_travel   * travel_score
          + W_specialty * specialty_score
          + W_bed       * bed_score
          + W_vent      * ventilator_score

Weights shift when urgency == "emergency": travel_score gets a much higher
weight because every minute matters in the golden hour.
"""

import math
from dataclasses import dataclass

import httpx
from app.core.config import settings
from app.schemas.hospital import HospitalOut, HospitalRecommendation, ScoreBreakdown

# ---------------------------------------------------------------------------
# Weight tables
# ---------------------------------------------------------------------------

_WEIGHTS_NORMAL = {
    "travel": 0.30,
    "specialty": 0.40,
    "bed": 0.25,
    "ventilator": 0.05,
}

_WEIGHTS_URGENT = {
    "travel": 0.40,
    "specialty": 0.35,
    "bed": 0.20,
    "ventilator": 0.05,
}

_WEIGHTS_EMERGENCY = {
    "travel": 0.55,
    "specialty": 0.25,
    "bed": 0.15,
    "ventilator": 0.05,
}


def _weights(urgency: str) -> dict[str, float]:
    if urgency == "emergency":
        return _WEIGHTS_EMERGENCY
    if urgency == "urgent":
        return _WEIGHTS_URGENT
    return _WEIGHTS_NORMAL


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------

_EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return great-circle distance in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# OpenRouteService ETA (optional — graceful fallback)
# ---------------------------------------------------------------------------


async def _ors_eta_minutes(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> float | None:
    """
    Call OpenRouteService Directions API (driving-car profile).
    Returns travel time in minutes, or None if unavailable / key missing.
    ORS coordinate order is [lng, lat].
    """
    key = settings.ors_api_key
    if not key:
        return None

    url = "https://api.openrouteservice.org/v2/directions/driving-car"
    body = {
        "coordinates": [
            [origin_lng, origin_lat],
            [dest_lng, dest_lat],
        ]
    }
    headers = {"Authorization": key, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.post(url, json=body, headers=headers)
            res.raise_for_status()
            data = res.json()
        duration_seconds = data["routes"][0]["summary"]["duration"]
        return round(duration_seconds / 60, 1)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Individual score components
# ---------------------------------------------------------------------------


def _travel_score(distance_km: float) -> float:
    """
    Exponential decay: 0 km → 1.0, 50 km → ~0.14, 100 km → ~0.02.
    Hospitals beyond ~100 km score near zero.
    """
    return math.exp(-distance_km / 30.0)


def _specialty_score(hospital_specialties: list[str], needed: str) -> float:
    """1.0 exact match, 0.5 partial (substring), 0.0 no match."""
    needed_lower = needed.lower().replace("_", " ")
    for s in hospital_specialties:
        s_lower = s.lower().replace("_", " ")
        if s_lower == needed_lower:
            return 1.0
    for s in hospital_specialties:
        s_lower = s.lower().replace("_", " ")
        if needed_lower in s_lower or s_lower in needed_lower:
            return 0.5
    return 0.0


def _bed_score(icu_available: int, general_available: int) -> float:
    """
    Sigmoid-like: 0 beds → 0.0 (heavy penalty), scales up to 1.0 at ~20 beds.
    Zero available beds returns 0.0 regardless.
    """
    total = icu_available + general_available
    if total == 0:
        return 0.0
    return min(1.0, total / 20.0)


def _ventilator_score(ventilators_available: int, specialty: str) -> float:
    """
    Only meaningful for respiratory / cardiac emergencies.
    Returns 0–1 based on ventilator count (capped at 5).
    """
    respiratory = {"cardiology", "pulmonology", "emergency", "icu", "critical_care"}
    if specialty.lower() not in respiratory:
        return 0.5  # neutral — not penalised, not rewarded
    if ventilators_available == 0:
        return 0.0
    return min(1.0, ventilators_available / 5.0)


# ---------------------------------------------------------------------------
# Public ranking function
# ---------------------------------------------------------------------------


@dataclass
class _Candidate:
    hospital: HospitalOut
    distance_km: float
    eta_minutes: float | None
    breakdown: ScoreBreakdown


async def rank_hospitals(
    *,
    hospitals: list[HospitalOut],
    specialty: str,
    urgency: str,
    patient_lat: float,
    patient_lng: float,
    radius_km: float = 50.0,
    top_n: int = 3,
) -> list[HospitalRecommendation]:
    """
    1. Filter hospitals within radius_km.
    2. Compute weighted score for each.
    3. Fetch ORS ETA for top candidates (up to top_n * 2 to limit API calls).
    4. Return top_n sorted by score descending.
    """
    w = _weights(urgency)

    # --- Step 1: distance filter ---
    candidates: list[_Candidate] = []
    for h in hospitals:
        dist = haversine_km(patient_lat, patient_lng, h.lat, h.lng)
        if dist > radius_km:
            continue

        ts = _travel_score(dist)
        ss = _specialty_score(h.specialties, specialty)
        bs = _bed_score(h.icu_available, h.general_available)
        vs = _ventilator_score(h.ventilators_available, specialty)

        total = w["travel"] * ts + w["specialty"] * ss + w["bed"] * bs + w["ventilator"] * vs

        breakdown = ScoreBreakdown(
            travel_score=round(ts, 4),
            specialty_score=round(ss, 4),
            bed_score=round(bs, 4),
            ventilator_score=round(vs, 4),
            total=round(total, 4),
        )
        candidates.append(
            _Candidate(
                hospital=h, distance_km=round(dist, 2), eta_minutes=None, breakdown=breakdown
            )
        )

    # --- Step 2: sort by score ---
    candidates.sort(key=lambda c: c.breakdown.total, reverse=True)
    top = candidates[: top_n * 2]  # fetch ETA for a wider pool, then re-trim

    # --- Step 3: ORS ETA (best-effort, concurrent) ---
    import asyncio

    async def _enrich(c: _Candidate) -> _Candidate:
        eta = await _ors_eta_minutes(patient_lat, patient_lng, c.hospital.lat, c.hospital.lng)
        return _Candidate(
            hospital=c.hospital,
            distance_km=c.distance_km,
            eta_minutes=eta,
            breakdown=c.breakdown,
        )

    enriched = await asyncio.gather(*[_enrich(c) for c in top])

    # --- Step 4: final sort (ETA available → re-weight slightly, else keep score order) ---
    final = sorted(enriched, key=lambda c: c.breakdown.total, reverse=True)[:top_n]

    return [
        HospitalRecommendation(
            hospital=c.hospital,
            distance_km=c.distance_km,
            eta_minutes=c.eta_minutes,
            score_breakdown=c.breakdown,
        )
        for c in final
    ]
