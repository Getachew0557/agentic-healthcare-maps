"""
Seed demo doctors with room assignments for the first 10 hospitals.

Usage (from backend/ directory):
    python scripts/seed_doctors.py

Idempotent: skips if doctors already exist for a hospital.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital

DOCTORS_PER_HOSPITAL = [
    {"name": "Dr. Arjun Sharma", "specialty": "cardiology", "phone": None, "room": "Cardio-101"},
    {"name": "Dr. Priya Nair", "specialty": "neurology", "phone": None, "room": "Neuro-205"},
    {"name": "Dr. Rahul Mehta", "specialty": "emergency", "phone": None, "room": "ER-01"},
    {"name": "Dr. Sunita Patel", "specialty": "pediatrics", "phone": None, "room": None},  # no room — tests anti-hallucination
    {"name": "Dr. Vikram Singh", "specialty": "orthopedics", "phone": None, "room": "Ortho-312"},
]


def seed_doctors() -> None:
    db = SessionLocal()
    try:
        hospitals = db.scalars(select(Hospital).limit(10)).all()
        added_doctors = 0
        added_rooms = 0

        for hospital in hospitals:
            existing = db.scalar(
                select(Doctor).where(Doctor.hospital_id == hospital.id)
            )
            if existing:
                continue

            for d_data in DOCTORS_PER_HOSPITAL:
                doctor = Doctor(
                    hospital_id=hospital.id,
                    name=d_data["name"],
                    specialty=d_data["specialty"],
                    phone=d_data["phone"],
                    is_active=True,
                )
                db.add(doctor)
                db.flush()
                added_doctors += 1

                if d_data["room"]:
                    ra = DoctorRoomAssignment(
                        doctor_id=doctor.id,
                        hospital_id=hospital.id,
                        room_code=d_data["room"],
                        room_type="consultation",
                        is_active=True,
                    )
                    db.add(ra)
                    added_rooms += 1

        db.commit()
        print(f"Seed complete: {added_doctors} doctors added, {added_rooms} room assignments.")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_doctors()
