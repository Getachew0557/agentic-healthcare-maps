from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator, model_validator


class AvailabilityUpdate(BaseModel):
    icu_available: int | None = None
    general_available: int | None = None
    ventilators_available: int | None = None
    status: str | None = None  # "normal" | "busy" | "emergency_only"

    @field_validator("icu_available", "general_available", "ventilators_available", mode="before")
    @classmethod
    def non_negative(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("Value cannot be negative")
        return v

    @field_validator("status", mode="before")
    @classmethod
    def valid_status(cls, v: str | None) -> str | None:
        allowed = {"normal", "busy", "emergency_only"}
        if v is not None and v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v

    @model_validator(mode="after")
    def at_least_one_field(self) -> "AvailabilityUpdate":
        fields = (self.icu_available, self.general_available, self.ventilators_available, self.status)
        if all(f is None for f in fields):
            raise ValueError("At least one field must be provided")
        return self


class AvailabilityLogOut(BaseModel):
    id: int
    hospital_id: int
    updated_by_user_id: int
    field_name: str
    old_value: str
    new_value: str
    created_at: datetime

    model_config = {"from_attributes": True}
