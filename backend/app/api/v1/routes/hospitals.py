from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.specialty import HospitalSpecialty
from app.schemas.hospital import HospitalOut

router = APIRouter()


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


@router.get(
    "",
    response_model=list[HospitalOut],
    summary="List all hospitals",
    description="""
Returns all hospitals in the database. Used by the patient map to load markers on initial render.

**Optional filters:**
- `specialty` — case-insensitive partial match (e.g. `cardio` matches `cardiology`)
- `status` — exact match: `normal` | `busy` | `emergency_only`
- `limit` — max results (default 200, max 500)

**Marker colour logic for the frontend:**
| `icu_available + general_available` | Colour |
|---|---|
| > 10 | 🟢 Green |
| 1–10 | 🟡 Yellow |
| 0 | 🔴 Red |
| unknown | ⚫ Gray |
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Lilavati Hospital",
                            "address": "Bandra West, Mumbai",
                            "phone": "+91-22-26751000",
                            "lat": 19.0596,
                            "lng": 72.8295,
                            "is_24x7": True,
                            "status": "normal",
                            "icu_total": 40,
                            "icu_available": 12,
                            "general_total": 300,
                            "general_available": 87,
                            "ventilators_available": 8,
                            "specialties": ["cardiology", "neurology", "emergency"],
                        }
                    ]
                }
            }
        }
    },
)
def list_hospitals(
    specialty: str | None = Query(None, description="Filter by specialty name (partial match)"),
    status: str | None = Query(None, description="Filter by status: normal | busy | emergency_only"),
    limit: int = Query(200, le=500, description="Maximum number of results"),
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
    return [_build_hospital_out(h, db) for h in hospitals]


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
