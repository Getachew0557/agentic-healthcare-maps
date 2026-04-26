from __future__ import annotations

from app.core.auth import require_role
from app.db.session import get_db
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital
from app.models.user import User, UserRole
from app.schemas.doctor import (
    DoctorCreate,
    DoctorOut,
    DoctorUpdate,
    RoomAssignmentCreate,
    RoomAssignmentOut,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _assert_hospital_access(user: User, hospital_id: int) -> None:
    if user.role == UserRole.admin:
        return
    if user.hospital_id != hospital_id:
        raise HTTPException(
            status_code=403,
            detail="hospital_staff can only manage their own hospital",
        )


def _active_room(doctor: Doctor) -> DoctorRoomAssignment | None:
    """Return the currently active room assignment for a doctor, or None."""
    for ra in doctor.room_assignments:
        if ra.is_active:
            return ra
    return None


def _build_doctor_out(doctor: Doctor) -> DoctorOut:
    ra = _active_room(doctor)
    room_out = (
        RoomAssignmentOut(
            id=ra.id,
            room_code=ra.room_code,
            room_type=ra.room_type,
            is_active=ra.is_active,
            valid_from=ra.valid_from,
            valid_to=ra.valid_to,
        )
        if ra
        else None
    )
    return DoctorOut(
        id=doctor.id,
        hospital_id=doctor.hospital_id,
        name=doctor.name,
        specialty=doctor.specialty,
        phone=doctor.phone,
        is_active=doctor.is_active,
        room=room_out,
        created_at=doctor.created_at,
        updated_at=doctor.updated_at,
    )


# ---------------------------------------------------------------------------
# GET /hospitals/{hospital_id}/doctors
# ---------------------------------------------------------------------------


@router.get(
    "/{hospital_id}/doctors",
    response_model=list[DoctorOut],
    summary="List doctors at a hospital",
    description="""
Returns all doctors at a hospital with their active room assignment (if any).

If a doctor has no active room assignment, `room` is `null`.
The frontend should display: **"Room: not on file — call hospital to confirm."**

No authentication required (public read).
    """,
)
def list_doctors(
    hospital_id: int,
    specialty: str | None = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
) -> list[DoctorOut]:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    stmt = select(Doctor).where(Doctor.hospital_id == hospital_id)
    if active_only:
        stmt = stmt.where(Doctor.is_active == True)  # noqa: E712
    if specialty:
        stmt = stmt.where(Doctor.specialty.ilike(f"%{specialty}%"))

    doctors = db.scalars(stmt).all()
    # Eagerly load room assignments to avoid N+1
    for d in doctors:
        _ = d.room_assignments
    return [_build_doctor_out(d) for d in doctors]


# ---------------------------------------------------------------------------
# POST /hospitals/{hospital_id}/doctors
# ---------------------------------------------------------------------------


@router.post(
    "/{hospital_id}/doctors",
    response_model=DoctorOut,
    status_code=201,
    summary="Add a doctor to a hospital",
    description="""
Add a new doctor to a hospital.

**Requires JWT** — `admin` or `hospital_staff` (own hospital only).

The doctor is created without a room assignment.
The dashboard will show: **"This doctor has no room assigned — AI will not invent a room."**
    """,
    responses={
        201: {"description": "Doctor created"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Hospital not found"},
    },
)
def create_doctor(
    hospital_id: int,
    payload: DoctorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> DoctorOut:
    _assert_hospital_access(user, hospital_id)

    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    doctor = Doctor(
        hospital_id=hospital_id,
        name=payload.name,
        specialty=payload.specialty,
        phone=payload.phone,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    _ = doctor.room_assignments  # load relationship
    return _build_doctor_out(doctor)


# ---------------------------------------------------------------------------
# PATCH /hospitals/{hospital_id}/doctors/{doctor_id}
# ---------------------------------------------------------------------------


@router.patch(
    "/{hospital_id}/doctors/{doctor_id}",
    response_model=DoctorOut,
    summary="Update a doctor",
    description="Update doctor name, specialty, phone, or active status. Requires JWT.",
    responses={
        200: {"description": "Updated doctor"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Doctor not found"},
    },
)
def update_doctor(
    hospital_id: int,
    doctor_id: int,
    payload: DoctorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> DoctorOut:
    _assert_hospital_access(user, hospital_id)

    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.hospital_id == hospital_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if payload.name is not None:
        doctor.name = payload.name.strip()
    if payload.specialty is not None:
        doctor.specialty = payload.specialty.strip()
    if payload.phone is not None:
        doctor.phone = payload.phone.strip() or None
    if payload.is_active is not None:
        doctor.is_active = payload.is_active

    db.commit()
    db.refresh(doctor)
    _ = doctor.room_assignments
    return _build_doctor_out(doctor)


# ---------------------------------------------------------------------------
# DELETE /hospitals/{hospital_id}/doctors/{doctor_id}
# ---------------------------------------------------------------------------


@router.delete(
    "/{hospital_id}/doctors/{doctor_id}",
    status_code=204,
    summary="Remove a doctor from a hospital",
    description="Soft-delete: sets is_active=False and deactivates all room assignments. Requires JWT.",
    responses={
        204: {"description": "Doctor deactivated"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Doctor not found"},
    },
)
def delete_doctor(
    hospital_id: int,
    doctor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> None:
    _assert_hospital_access(user, hospital_id)

    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.hospital_id == hospital_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.is_active = False
    for ra in doctor.room_assignments:
        ra.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# POST /hospitals/{hospital_id}/doctors/{doctor_id}/room
# ---------------------------------------------------------------------------


@router.post(
    "/{hospital_id}/doctors/{doctor_id}/room",
    response_model=RoomAssignmentOut,
    status_code=201,
    summary="Assign a room to a doctor",
    description="""
Assign a physical room to a doctor.

**Anti-hallucination contract:** Only rooms stored here will be shown to patients.
If no room is assigned, the AI response uses the template:
*"Room: not on file. Call {hospital_phone} to confirm."*

Deactivates any previous active room assignment before creating the new one.

**Requires JWT** — `admin` or `hospital_staff` (own hospital only).
    """,
    responses={
        201: {"description": "Room assigned"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Doctor not found"},
    },
)
def assign_room(
    hospital_id: int,
    doctor_id: int,
    payload: RoomAssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> RoomAssignmentOut:
    _assert_hospital_access(user, hospital_id)

    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.hospital_id == hospital_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Deactivate existing active assignments
    existing = db.scalars(
        select(DoctorRoomAssignment).where(
            DoctorRoomAssignment.doctor_id == doctor_id,
            DoctorRoomAssignment.is_active == True,  # noqa: E712
        )
    ).all()
    for ra in existing:
        ra.is_active = False

    ra = DoctorRoomAssignment(
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        room_code=payload.room_code,
        room_type=payload.room_type,
        is_active=True,
    )
    db.add(ra)
    db.commit()
    db.refresh(ra)
    return RoomAssignmentOut(
        id=ra.id,
        room_code=ra.room_code,
        room_type=ra.room_type,
        is_active=ra.is_active,
        valid_from=ra.valid_from,
        valid_to=ra.valid_to,
    )


# ---------------------------------------------------------------------------
# DELETE /hospitals/{hospital_id}/doctors/{doctor_id}/room
# ---------------------------------------------------------------------------


@router.delete(
    "/{hospital_id}/doctors/{doctor_id}/room",
    status_code=204,
    summary="Remove room assignment from a doctor",
    description="""
Deactivates the doctor's current room assignment.

After this, the AI will use the template:
*"Room: not on file. Call hospital to confirm."*

**Requires JWT** — `admin` or `hospital_staff` (own hospital only).
    """,
)
def remove_room(
    hospital_id: int,
    doctor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> None:
    _assert_hospital_access(user, hospital_id)

    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.hospital_id == hospital_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    active = db.scalars(
        select(DoctorRoomAssignment).where(
            DoctorRoomAssignment.doctor_id == doctor_id,
            DoctorRoomAssignment.is_active == True,  # noqa: E712
        )
    ).all()
    for ra in active:
        ra.is_active = False
    db.commit()
