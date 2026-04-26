from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AvailabilityLog(Base):
    __tablename__ = "availability_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), index=True
    )
    updated_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    field_name: Mapped[str] = mapped_column(String(64))
    old_value: Mapped[str] = mapped_column(String(64))
    new_value: Mapped[str] = mapped_column(String(64))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
