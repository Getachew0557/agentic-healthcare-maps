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


@router.get("", response_model=list[HospitalOut])
def list_hospitals(
    specialty: str | None = Query(None, description="Filter by specialty name"),
    status: str | None = Query(None, description="Filter by status: normal | busy | emergency_only"),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
):
    """
    Return all hospitals (optionally filtered).
    Used by the patient map to load all markers on initial render.
    """
    stmt = select(Hospital)

    if status:
        stmt = stmt.where(Hospital.status == status)

    if specialty:
        # only hospitals that have this specialty
        sub = select(HospitalSpecialty.hospital_id).where(
            HospitalSpecialty.name.ilike(f"%{specialty}%")
        )
        stmt = stmt.where(Hospital.id.in_(sub))

    stmt = stmt.limit(limit)
    hospitals = db.scalars(stmt).all()
    return [_build_hospital_out(h, db) for h in hospitals]


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    """Return a single hospital by ID."""
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _build_hospital_out(hospital, db)
