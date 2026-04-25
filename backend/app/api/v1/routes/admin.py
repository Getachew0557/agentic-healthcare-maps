from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role
from app.core.config import settings
from app.db.session import get_db
from app.models.availability_log import AvailabilityLog
from app.models.hospital import Hospital, HospitalStatus
from app.models.user import User, UserRole
from app.schemas.admin import AvailabilityLogOut, AvailabilityUpdate
from app.schemas.hospital import HospitalOut
from app.api.v1.routes.hospitals import _build_hospital_out
from app.services.realtime.ws_manager import broadcast_availability_update

router = APIRouter()

_UPDATABLE_FIELDS = ("icu_available", "general_available", "ventilators_available")


def _assert_hospital_access(user: User, hospital_id: int) -> None:
    if user.role == UserRole.admin:
        return
    if user.hospital_id != hospital_id:
        raise HTTPException(
            status_code=403,
            detail="hospital_staff can only update their own hospital",
        )


@router.patch(
    "/hospitals/{hospital_id}/availability",
    response_model=HospitalOut,
    summary="Update hospital bed availability",
    description="""
Update one or more availability fields for a hospital. At least one field must be provided.

**Authorization:**
- `admin` — can update any hospital
- `hospital_staff` — can only update their own `hospital_id`

**Validation rules:**
- Values cannot be negative
- `icu_available` cannot exceed `icu_total`
- `general_available` cannot exceed `general_total`
- `status` must be `normal`, `busy`, or `emergency_only`

**Side effects:**
- One `AvailabilityLog` row written per changed field (audit trail)
- WebSocket broadcast sent to all connected clients instantly
    """,
    responses={
        200: {"description": "Updated hospital with new availability values"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "hospital_staff trying to update another hospital"},
        404: {"description": "Hospital not found"},
        422: {"description": "Validation error — negative value or exceeds total"},
    },
)
async def update_availability(
    hospital_id: int,
    payload: AvailabilityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin, UserRole.hospital_staff)),
) -> HospitalOut:
    _assert_hospital_access(user, hospital_id)

    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    logs: list[AvailabilityLog] = []

    for field in _UPDATABLE_FIELDS:
        new_val = getattr(payload, field)
        if new_val is None:
            continue

        old_val: int = getattr(hospital, field)
        total_field = field.replace("available", "total")
        if hasattr(hospital, total_field):
            total: int = getattr(hospital, total_field)
            if total > 0 and new_val > total:
                raise HTTPException(
                    status_code=422,
                    detail=f"{field} ({new_val}) cannot exceed {total_field} ({total})",
                )

        setattr(hospital, field, new_val)
        logs.append(
            AvailabilityLog(
                hospital_id=hospital_id,
                updated_by_user_id=user.id,
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
            )
        )

    if payload.status is not None:
        old_status = hospital.status.value
        hospital.status = HospitalStatus(payload.status)
        logs.append(
            AvailabilityLog(
                hospital_id=hospital_id,
                updated_by_user_id=user.id,
                field_name="status",
                old_value=old_status,
                new_value=payload.status,
            )
        )

    db.add_all(logs)
    db.commit()
    db.refresh(hospital)

    await broadcast_availability_update(
        hospital_id=hospital_id,
        icu_available=hospital.icu_available,
        general_available=hospital.general_available,
        ventilators_available=hospital.ventilators_available,
        status=hospital.status.value,
        redis_url=settings.redis_url,
    )

    return _build_hospital_out(hospital, db)


@router.get(
    "/hospitals/{hospital_id}/availability-logs",
    response_model=list[AvailabilityLogOut],
    summary="Get availability audit logs for a hospital",
    description="""
Returns a paginated list of availability changes for a hospital, newest first.

Each log entry records:
- Which field changed (`icu_available`, `general_available`, `ventilators_available`, `status`)
- The old and new values
- Which user made the change
- Timestamp (UTC)

**Authorization:** same hospital-scoping rules as the PATCH endpoint.
    """,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 42,
                            "hospital_id": 5,
                            "updated_by_user_id": 1,
                            "field_name": "icu_available",
                            "old_value": "5",
                            "new_value": "3",
                            "created_at": "2026-04-26T10:30:00Z",
                        }
                    ]
                }
            }
        },
        401: {"description": "Missing or invalid token"},
        403: {"description": "Access denied"},
        404: {"description": "Hospital not found"},
    },
)
def get_availability_logs(
    hospital_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AvailabilityLogOut]:
    _assert_hospital_access(user, hospital_id)

    hospital = db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    logs = db.scalars(
        select(AvailabilityLog)
        .where(AvailabilityLog.hospital_id == hospital_id)
        .order_by(AvailabilityLog.created_at.desc())
        .limit(limit)
    ).all()

    return [AvailabilityLogOut.model_validate(log) for log in logs]
