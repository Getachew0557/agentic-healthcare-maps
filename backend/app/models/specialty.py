from __future__ import annotations

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HospitalSpecialty(Base):
    __tablename__ = "hospital_specialties"
    __table_args__ = (UniqueConstraint("hospital_id", "name", name="uq_hospital_specialty"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)

