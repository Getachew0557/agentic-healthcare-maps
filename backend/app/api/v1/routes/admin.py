from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role
from app.core.config import settings
from app.db.session import get_db
from app.models.availability_log import AvailabilityLog
from app.models.chat import AgentTrace, ChatMessage, ChatSession
from app.models.hospital import Hospital, HospitalStatus
from app.models.user import User, UserRole
from app.schemas.admin import AvailabilityLogOut, AvailabilityUpdate
from app.schemas.chat import AgentTraceOut, ChatMessageOut, ChatSessionOut
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


# ---------------------------------------------------------------------------
# PATCH /admin/hospitals/{hospital_id}/availability
# ---------------------------------------------------------------------------

@router.patch(
    "/hospitals/{hospital_id}/availability",
    response_model=HospitalOut,
    summary="Update hospital bed availability",
    description="""
Update one or more availability fields for a hospital.

**Authorization:** admin = any hospital; hospital_staff = own hospital only.

**Side effects:** AvailabilityLog row per changed field + WebSocket broadcast.
    """,
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
        logs.append(AvailabilityLog(
            hospital_id=hospital_id,
            updated_by_user_id=user.id,
            field_name=field,
            old_value=str(old_val),
            new_value=str(new_val),
        ))

    if payload.status is not None:
        old_status = hospital.status.value
        hospital.status = HospitalStatus(payload.status)
        logs.append(AvailabilityLog(
            hospital_id=hospital_id,
            updated_by_user_id=user.id,
            field_name="status",
            old_value=old_status,
            new_value=payload.status,
        ))

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

    # Re-index in Chroma after availability change
    try:
        from sqlalchemy import select as sa_select
        from app.models.specialty import HospitalSpecialty
        from app.services.vector.embeddings import index_hospital
        specs = list(db.scalars(
            sa_select(HospitalSpecialty.name).where(HospitalSpecialty.hospital_id == hospital_id)
        ).all())
        parts = [p.strip() for p in hospital.address.split(",")]
        index_hospital(
            hospital_id=hospital_id,
            name=hospital.name,
            address=hospital.address,
            specialties=specs,
            status=hospital.status.value,
            icu_available=hospital.icu_available,
            general_available=hospital.general_available,
            ventilators_available=hospital.ventilators_available,
            is_24x7=hospital.is_24x7,
            phone=hospital.phone,
            website=hospital.website,
            city=parts[0] if parts else "",
            country=parts[-1] if len(parts) > 1 else "",
        )
    except Exception:
        pass  # non-fatal

    return _build_hospital_out(hospital, db)


# ---------------------------------------------------------------------------
# GET /admin/hospitals/{hospital_id}/availability-logs
# ---------------------------------------------------------------------------

@router.get(
    "/hospitals/{hospital_id}/availability-logs",
    response_model=list[AvailabilityLogOut],
    summary="Get availability audit logs for a hospital",
    description="Returns availability changes for a hospital, newest first. Requires JWT.",
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


# ---------------------------------------------------------------------------
# GET /admin/audit  — global audit log (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/audit",
    response_model=list[AvailabilityLogOut],
    summary="Global audit log (admin only)",
    description="""
Returns all availability changes across all hospitals, newest first.

Filterable by `hospital_id` and `field_name`.
Requires `admin` role.
    """,
)
def global_audit(
    hospital_id: int | None = Query(None, description="Filter by hospital"),
    field_name: str | None = Query(None, description="Filter by field: icu_available | general_available | status"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[AvailabilityLogOut]:
    stmt = select(AvailabilityLog).order_by(AvailabilityLog.created_at.desc())
    if hospital_id is not None:
        stmt = stmt.where(AvailabilityLog.hospital_id == hospital_id)
    if field_name:
        stmt = stmt.where(AvailabilityLog.field_name == field_name)
    stmt = stmt.offset(offset).limit(limit)
    logs = db.scalars(stmt).all()
    return [AvailabilityLogOut.model_validate(log) for log in logs]


# ---------------------------------------------------------------------------
# GET /admin/metrics  — usage metrics (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/metrics",
    summary="System usage metrics (admin only)",
    description="Returns counts and recent activity. Requires `admin` role.",
)
def metrics(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> dict:
    total_hospitals = db.scalar(select(func.count()).select_from(Hospital)) or 0
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_logs = db.scalar(select(func.count()).select_from(AvailabilityLog)) or 0

    busy = db.scalar(
        select(func.count()).select_from(Hospital).where(Hospital.status == HospitalStatus.busy)
    ) or 0
    emergency_only = db.scalar(
        select(func.count()).select_from(Hospital).where(Hospital.status == HospitalStatus.emergency_only)
    ) or 0

    # Recent 5 log entries
    recent_logs = db.scalars(
        select(AvailabilityLog).order_by(AvailabilityLog.created_at.desc()).limit(5)
    ).all()

    # Vector index stats
    try:
        from app.services.vector.embeddings import get_index_stats
        vector_stats = get_index_stats()
    except Exception:
        vector_stats = {"error": "unavailable"}

    return {
        "hospitals": {
            "total": total_hospitals,
            "status_normal": total_hospitals - busy - emergency_only,
            "status_busy": busy,
            "status_emergency_only": emergency_only,
        },
        "users": {"total": total_users},
        "audit_logs": {"total": total_logs},
        "vector_index": vector_stats,
        "recent_changes": [AvailabilityLogOut.model_validate(l).model_dump() for l in recent_logs],
    }


# ---------------------------------------------------------------------------
# POST /admin/vector/reindex  — rebuild Chroma index (admin only)
# ---------------------------------------------------------------------------

@router.post(
    "/vector/reindex",
    summary="Rebuild vector search index (admin only)",
    description="""
Re-embeds all hospitals from PostgreSQL into Chroma.

Run this after a bulk CSV import or if the Chroma index is out of sync.
Takes 30–120 seconds depending on hospital count.

Requires `admin` role.
    """,
)
def reindex_vector(
    user: User = Depends(require_role(UserRole.admin)),
) -> dict:
    from app.services.vector.embeddings import index_all_hospitals
    count = index_all_hospitals()
    return {"indexed": count, "status": "ok"}


# ---------------------------------------------------------------------------
# GET /admin/sessions — chat sessions (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/sessions",
    response_model=list[ChatSessionOut],
    summary="List chat sessions (admin only)",
    description="Returns all patient chat sessions, newest first. Requires `admin` role.",
)
def list_sessions(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[ChatSessionOut]:
    sessions = db.scalars(
        select(ChatSession).order_by(ChatSession.created_at.desc()).offset(offset).limit(limit)
    ).all()
    result = []
    for s in sessions:
        count = db.scalar(
            select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == s.id)
        ) or 0
        result.append(ChatSessionOut(
            id=s.id,
            session_token=s.session_token,
            created_at=s.created_at,
            message_count=count,
        ))
    return result


@router.get(
    "/sessions/{session_id}/messages",
    response_model=list[ChatMessageOut],
    summary="Get messages in a chat session (admin only)",
    description="Returns all messages in a session with tool calls and citations. Requires `admin` role.",
)
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[ChatMessageOut]:
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    ).all()
    return [ChatMessageOut.model_validate(m) for m in messages]


# ---------------------------------------------------------------------------
# GET /admin/traces — agent traces (admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/traces",
    response_model=list[AgentTraceOut],
    summary="List agent traces (admin only)",
    description="""
Returns all agent execution traces, newest first.

Each trace shows:
- Which tools were called (gemini, tavily, ranking, chroma)
- What was retrieved from the vector index
- The final answer JSON with claims array
- Latency in milliseconds
- Safety flags (emergency_keyword_triggered, hallucination_guard_triggered)

This is the governance page that proves anti-hallucination compliance to judges.

Requires `admin` role.
    """,
)
def list_traces(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[AgentTraceOut]:
    traces = db.scalars(
        select(AgentTrace).order_by(AgentTrace.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return [AgentTraceOut.model_validate(t) for t in traces]
