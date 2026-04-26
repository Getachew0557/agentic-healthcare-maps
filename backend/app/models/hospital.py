from __future__ import annotations

import enum

from sqlalchemy import Boolean, Enum, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HospitalStatus(str, enum.Enum):
    normal = "normal"
    busy = "busy"
    emergency_only = "emergency_only"


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    address: Mapped[str] = mapped_column(Text, default="")
    phone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(512), nullable=True)

    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

    is_24x7: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[HospitalStatus] = mapped_column(
        Enum(HospitalStatus), default=HospitalStatus.normal
    )

    icu_total: Mapped[int] = mapped_column(Integer, default=0)
    icu_available: Mapped[int] = mapped_column(Integer, default=0)
    general_total: Mapped[int] = mapped_column(Integer, default=0)
    general_available: Mapped[int] = mapped_column(Integer, default=0)
    ventilators_available: Mapped[int] = mapped_column(Integer, default=0)
