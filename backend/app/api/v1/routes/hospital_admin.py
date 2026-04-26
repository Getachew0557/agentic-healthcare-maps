from __future__ import annotations

"""
Admin + hospital_staff hospital management endpoints.

Admin:
  GET    /admin/hospitals              — list all hospitals (paginated, filterable)
  POST   /admin/hospitals              — create a new hospital
  GET    /admin/hospitals/{id}         — get one hospital (full detail)
  PATCH  /admin/hospitals/{id}         — update any hospital
  DELETE /admin/hospitals/{id}         — delete a hospital

Hospital staff (own hospital only):
  GET    /admin/hospitals/me           — get own hospital
  PATCH  /admin/hospitals/me           — update own hospital profile
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role
from app.db.session import get_db
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
from app.models.user import User, UserRole
from app.schemas.hospital import HospitalCreate, HospitalOut, HospitalUpdate
from app.api.v1.routes.hospitals import _build_hospital_out

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /admin/hospitals/me  — hospital staff: get own hospital
# ---------------------------------------------------------------------------

@router.get(
    "/hospitals/me",
    response_model=HospitalOut,
    summary="Get own hospital (hospital_staff)",
    description="Returns the hospital associated with the authenticated hospital_staff user.",
)
def get_my_hospital(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HospitalOut:
    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="Admins are not linked to a specific hospital. Use /admin/hospitals/{id}.")
    if not user.hospital_id:
        raise HTTPException(status_code=404, detail="No hospital linked to your account")
    hospital = db.get(Hospital, user.hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# PATCH /admin/hospitals/me  — hospital staff: update own hospital
# ---------------------------------------------------------------------------

@router.patch(
    "/hospitals/me",
    response_model=HospitalOut,
    summary="Update own hospital profile (hospital_staff)",
    description="""
Hospital staff can update their own hospital's profile information:
name, address, phone, coordinates, is_24x7, status, and bed counts.

This is the self-service endpoint for hospital administrators.
Changes are reflected immediately on the patient map.
    """,
)
def update_my_hospital(
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.hospital_staff)),
) -> HospitalOut:
    if not user.hospital_id:
        raise HTTPException(status_code=404, detail="No hospital linked to your account")
    hospital = db.get(Hospital, user.hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    _apply_hospital_update(hospital, payload)
    db.commit()
    db.refresh(hospital)
    _reindex(hospital, db)
    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# GET /admin/hospitals  — list all (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/hospitals",
    response_model=list[HospitalOut],
    summary="List all hospitals (admin)",
    description="Returns all hospitals with full detail. Supports pagination and name search. Requires `admin` role.",
)
def admin_list_hospitals(
    search: str | None = Query(None, description="Search by name (partial match)"),
    status: str | None = Query(None, description="Filter by status"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[HospitalOut]:
    stmt = select(Hospital)
    if search:
        stmt = stmt.where(Hospital.name.ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(Hospital.status == status)
    stmt = stmt.offset(offset).limit(limit)
    hospitals = db.scalars(stmt).all()
    return [_build_hospital_out(h, db) for h in hospitals]


# ---------------------------------------------------------------------------
# POST /admin/hospitals  — create (admin only)
# ---------------------------------------------------------------------------

@router.post(
    "/hospitals",
    response_model=HospitalOut,
    status_code=201,
    summary="Create a new hospital (admin)",
    description="Create a hospital with full profile. Specialties are created automatically. Requires `admin` role.",
)
def admin_create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> HospitalOut:
    # Check duplicate name
    existing = db.scalar(select(Hospital).where(Hospital.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="Hospital with this name already exists")

    try:
        status_enum = HospitalStatus(payload.status)
    except ValueError:
        status_enum = HospitalStatus.normal

    hospital = Hospital(
        name=payload.name,
        address=payload.address,
        phone=payload.phone,
        lat=payload.lat,
        lng=payload.lng,
        is_24x7=payload.is_24x7,
        status=status_enum,
        icu_total=payload.icu_total,
        icu_available=payload.icu_available,
        general_total=payload.general_total,
        general_available=payload.general_available,
        ventilators_available=payload.ventilators_available,
    )
    db.add(hospital)
    db.flush()

    seen: set[str] = set()
    for spec in payload.specialties:
        s = spec.strip().lower()
        if s and s not in seen:
            db.add(HospitalSpecialty(hospital_id=hospital.id, name=s))
            seen.add(s)

    db.commit()
    db.refresh(hospital)

    # Index in Chroma
    try:
        from app.services.vector.embeddings import index_hospital
        parts = [p.strip() for p in hospital.address.split(",")]
        index_hospital(
            hospital_id=hospital.id, name=hospital.name, address=hospital.address,
            specialties=list(seen), status=hospital.status.value,
            icu_available=hospital.icu_available, general_available=hospital.general_available,
            ventilators_available=hospital.ventilators_available, is_24x7=hospital.is_24x7,
            phone=hospital.phone, city=parts[0] if parts else "", country=parts[-1] if len(parts) > 1 else "",
        )
    except Exception:
        pass

    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# GET /admin/hospitals/{id}  — get one (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/hospitals/{hospital_id}",
    response_model=HospitalOut,
    summary="Get hospital by ID (admin)",
    description="Returns full hospital detail. Requires `admin` role.",
)
def admin_get_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> HospitalOut:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# PATCH /admin/hospitals/{id}  — update any (admin only)
# ---------------------------------------------------------------------------

@router.patch(
    "/hospitals/{hospital_id}",
    response_model=HospitalOut,
    summary="Update any hospital (admin)",
    description="Update hospital profile fields. Requires `admin` role.",
)
def admin_update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> HospitalOut:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    _apply_hospital_update(hospital, payload)
    db.commit()
    db.refresh(hospital)
    _reindex(hospital, db)
    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# DELETE /admin/hospitals/{id}  — delete (admin only)
# ---------------------------------------------------------------------------

@router.delete(
    "/hospitals/{hospital_id}",
    status_code=204,
    summary="Delete a hospital (admin)",
    description="Permanently deletes a hospital and all related data (doctors, specialties, logs). Requires `admin` role.",
)
def admin_delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> None:
    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    db.delete(hospital)
    db.commit()

    # Remove from Chroma
    try:
        from app.services.vector.embeddings import _get_collection
        _get_collection().delete(ids=[str(hospital_id)])
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _apply_hospital_update(hospital: Hospital, payload: HospitalUpdate) -> None:
    if payload.name is not None:
        hospital.name = payload.name.strip()
    if payload.address is not None:
        hospital.address = payload.address.strip()
    if payload.phone is not None:
        hospital.phone = payload.phone.strip() or None
    if payload.lat is not None:
        hospital.lat = payload.lat
    if payload.lng is not None:
        hospital.lng = payload.lng
    if payload.is_24x7 is not None:
        hospital.is_24x7 = payload.is_24x7
    if payload.status is not None:
        hospital.status = HospitalStatus(payload.status)
    if payload.icu_total is not None:
        hospital.icu_total = max(0, payload.icu_total)
    if payload.icu_available is not None:
        hospital.icu_available = max(0, payload.icu_available)
    if payload.general_total is not None:
        hospital.general_total = max(0, payload.general_total)
    if payload.general_available is not None:
        hospital.general_available = max(0, payload.general_available)
    if payload.ventilators_available is not None:
        hospital.ventilators_available = max(0, payload.ventilators_available)


def _reindex(hospital: Hospital, db: Session) -> None:
    try:
        from sqlalchemy import select as sa_select
        from app.services.vector.embeddings import index_hospital
        specs = list(db.scalars(
            sa_select(HospitalSpecialty.name).where(HospitalSpecialty.hospital_id == hospital.id)
        ).all())
        parts = [p.strip() for p in hospital.address.split(",")]
        index_hospital(
            hospital_id=hospital.id, name=hospital.name, address=hospital.address,
            specialties=specs, status=hospital.status.value,
            icu_available=hospital.icu_available, general_available=hospital.general_available,
            ventilators_available=hospital.ventilators_available, is_24x7=hospital.is_24x7,
            phone=hospital.phone, city=parts[0] if parts else "", country=parts[-1] if len(parts) > 1 else "",
        )
    except Exception:
        pass
