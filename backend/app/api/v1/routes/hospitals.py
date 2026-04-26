from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.specialty import HospitalSpecialty
from app.models.user import UserRole
from app.schemas.hospital import HospitalOut, SpecialtyCreate, SpecialtyOut

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helper — reused by patient.py and admin.py
# ---------------------------------------------------------------------------

def _build_hospital_out(hospital: Hospital, db: Session) -> HospitalOut:
    specialties = db.scalars(
        select(HospitalSpecialty.name).where(HospitalSpecialty.hospital_id == hospital.id)
    ).all()
    return HospitalOut(
        id=hospital.id,
        name=hospital.name,
        address=hospital.address,
        phone=hospital.phone,
        lat=hospital.lat,
        lng=hospital.lng,
        is_24x7=hospital.is_24x7,
        status=hospital.status.value,
        icu_total=hospital.icu_total,
        icu_available=hospital.icu_available,
        general_total=hospital.general_total,
        general_available=hospital.general_available,
        ventilators_available=hospital.ventilators_available,
        specialties=list(specialties),
    )


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# GET /hospitals
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[HospitalOut],
    summary="List all hospitals",
    description="""
Returns hospitals with optional filters.

**Filters:**
- `specialty` — case-insensitive partial match (e.g. `cardio` matches `cardiology`)
- `status` — `normal` | `busy` | `emergency_only`
- `lat` + `lng` + `radius_km` — geo filter using haversine distance (all three required together)
- `limit` — max results (default 200, max 500)

**Marker colour logic:**
| `icu_available + general_available` | Colour |
|---|---|
| > 10 | 🟢 Green |
| 1–10 | 🟡 Yellow |
| 0 | 🔴 Red |
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": [{
                        "id": 1, "name": "Lilavati Hospital",
                        "lat": 19.0596, "lng": 72.8295,
                        "status": "normal", "icu_available": 12,
                        "specialties": ["cardiology", "emergency"]
                    }]
                }
            }
        }
    },
)
def list_hospitals(
    specialty: str | None = Query(None, description="Filter by specialty (partial match)"),
    status: str | None = Query(None, description="Filter by status: normal | busy | emergency_only"),
    lat: float | None = Query(None, description="Patient latitude for geo filter"),
    lng: float | None = Query(None, description="Patient longitude for geo filter"),
    radius_km: float = Query(50.0, description="Radius in km for geo filter (requires lat+lng)"),
    limit: int = Query(200, le=500, description="Max results"),
    db: Session = Depends(get_db),
):
    stmt = select(Hospital)

    if status:
        stmt = stmt.where(Hospital.status == status)

    if specialty:
        sub = select(HospitalSpecialty.hospital_id).where(
            HospitalSpecialty.name.ilike(f"%{specialty}%")
        )
        stmt = stmt.where(Hospital.id.in_(sub))

    stmt = stmt.limit(limit)
    hospitals = db.scalars(stmt).all()

    # Apply geo filter in Python (no PostGIS required for MVP scale)
    if lat is not None and lng is not None:
        hospitals = [
            h for h in hospitals
            if _haversine_km(lat, lng, h.lat, h.lng) <= radius_km
        ]

    return [_build_hospital_out(h, db) for h in hospitals]


# ---------------------------------------------------------------------------
# GET /hospitals/{hospital_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{hospital_id}",
    response_model=HospitalOut,
    summary="Get a single hospital by ID",
    description="Returns full details for one hospital including current bed counts and specialties.",
    responses={
        200: {"content": {"application/json": {"example": {"id": 1, "name": "Lilavati Hospital", "status": "normal", "icu_available": 12}}}},
        404: {"description": "Hospital not found"},
    },
)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# GET /hospitals/{hospital_id}/specialties
# ---------------------------------------------------------------------------

@router.get(
    "/{hospital_id}/specialties",
    response_model=list[SpecialtyOut],
    summary="List specialties for a hospital",
    description="Returns all medical specialties offered by a hospital.",
    responses={
        200: {"content": {"application/json": {"example": [{"id": 1, "name": "cardiology"}, {"id": 2, "name": "emergency"}]}}},
        404: {"description": "Hospital not found"},
    },
)
def list_specialties(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    rows = db.scalars(
        select(HospitalSpecialty).where(HospitalSpecialty.hospital_id == hospital_id)
    ).all()
    return [SpecialtyOut(id=r.id, name=r.name) for r in rows]


# ---------------------------------------------------------------------------
# POST /hospitals/{hospital_id}/specialties
# ---------------------------------------------------------------------------

@router.post(
    "/{hospital_id}/specialties",
    response_model=SpecialtyOut,
    status_code=201,
    summary="Add a specialty to a hospital",
    description="""
Add a medical specialty to a hospital.

**Requires JWT** — `admin` or `hospital_staff` (own hospital only).

Duplicate specialty names for the same hospital are silently ignored (idempotent).
    """,
    responses={
        201: {"content": {"application/json": {"example": {"id": 5, "name": "neurology"}}}},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Hospital not found"},
    },
)
def add_specialty(
    hospital_id: int,
    payload: SpecialtyCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
):
    from app.api.v1.routes.admin import _assert_hospital_access
    _assert_hospital_access(user, hospital_id)

    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    name = payload.name.strip().lower()

    # Idempotent — return existing if already present
    existing = db.scalar(
        select(HospitalSpecialty).where(
            HospitalSpecialty.hospital_id == hospital_id,
            HospitalSpecialty.name == name,
        )
    )
    if existing:
        return SpecialtyOut(id=existing.id, name=existing.name)

    spec = HospitalSpecialty(hospital_id=hospital_id, name=name)
    db.add(spec)
    db.commit()
    db.refresh(spec)
    return SpecialtyOut(id=spec.id, name=spec.name)


# ---------------------------------------------------------------------------
# DELETE /hospitals/{hospital_id}/specialties/{specialty_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{hospital_id}/specialties/{specialty_id}",
    status_code=204,
    summary="Remove a specialty from a hospital",
    description="""
Remove a medical specialty from a hospital.

**Requires JWT** — `admin` or `hospital_staff` (own hospital only).
    """,
    responses={
        204: {"description": "Deleted successfully"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Hospital or specialty not found"},
    },
)
def delete_specialty(
    hospital_id: int,
    specialty_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
):
    from app.api.v1.routes.admin import _assert_hospital_access
    _assert_hospital_access(user, hospital_id)

    spec = db.scalar(
        select(HospitalSpecialty).where(
            HospitalSpecialty.id == specialty_id,
            HospitalSpecialty.hospital_id == hospital_id,
        )
    )
    if not spec:
        raise HTTPException(status_code=404, detail="Specialty not found")

    db.delete(spec)
    db.commit()
