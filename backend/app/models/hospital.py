from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

    icu_available: Mapped[int] = mapped_column(Integer, default=0)
    general_available: Mapped[int] = mapped_column(Integer, default=0)
    ventilators_available: Mapped[int] = mapped_column(Integer, default=0)

