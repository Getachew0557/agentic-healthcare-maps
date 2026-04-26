from __future__ import annotations

# Import models here so Alembic sees them via Base.metadata.
from app.models.availability_log import AvailabilityLog  # noqa: F401
from app.models.chat import AgentTrace, ChatMessage, ChatSession  # noqa: F401
from app.models.doctor import Doctor, DoctorRoomAssignment  # noqa: F401
from app.models.hospital import Hospital  # noqa: F401
from app.models.specialty import HospitalSpecialty  # noqa: F401
from app.models.user import User  # noqa: F401

