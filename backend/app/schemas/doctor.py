from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# Doctor schemas
# ---------------------------------------------------------------------------

class DoctorCreate(BaseModel):
    name: str
    specialty: str
    phone: str | None = None

    @field_validator("name", "specialty", mode="before")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()


class DoctorUpdate(BaseModel):
    name: str | None = None
    specialty: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class RoomAssignmentCreate(BaseModel):
    room_code: str
    room_type: str | None = None   # "consultation" | "icu" | "ward"

    @field_validator("room_code", mode="before")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("room_code cannot be empty")
        return v.strip()


class RoomAssignmentOut(BaseModel):
    id: int
    room_code: str
    room_type: str | None
    is_active: bool
    valid_from: datetime
    valid_to: datetime | None

    model_config = {"from_attributes": True}


class DoctorOut(BaseModel):
    id: int
    hospital_id: int
    name: str
    specialty: str
    phone: str | None
    is_active: bool
    room: RoomAssignmentOut | None   # active room assignment, None if not assigned
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
