"""
Create default test logins (idempotent). Run from repository backend/:

    python scripts/seed_dev_accounts.py

Creates (example.com is valid for Pydantic EmailStr; do not use @*.test TLDs — they are rejected):
  - chatmap-admin@example.com  — role admin (use /admin, full access)
  - chatmap-staff@example.com  — role hospital_staff linked to the first hospital row (use /dashboard)

Password for both: ChatMap2026!Dev
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.hospital import Hospital
from app.models.user import User, UserRole

DEV_PASSWORD = "ChatMap2026!Dev"
ADMIN_EMAIL = "chatmap-admin@example.com"
STAFF_EMAIL = "chatmap-staff@example.com"


def main() -> None:
    db = SessionLocal()
    try:
        first_hospital = db.scalar(select(Hospital).order_by(Hospital.id.asc()).limit(1))
        if not first_hospital:
            print("No hospitals in the database. Seed hospitals first, e.g. python scripts/seed.py")
            sys.exit(1)

        def ensure_user(email: str, role: UserRole, hospital_id: int | None) -> None:
            u = db.scalar(select(User).where(User.email == email))
            if u:
                print(f"  exists: {email} (id={u.id}, role={u.role.value})")
                return
            db.add(
                User(
                    email=email,
                    password_hash=hash_password(DEV_PASSWORD),
                    role=role,
                    hospital_id=hospital_id,
                )
            )
            db.commit()
            print(f"  created: {email} ({role.value}, hospital_id={hospital_id})")

        print("Dev accounts (password for all):")
        print(f"  {DEV_PASSWORD}\n")
        ensure_user(ADMIN_EMAIL, UserRole.admin, None)
        ensure_user(STAFF_EMAIL, UserRole.hospital_staff, first_hospital.id)
        print(f"\nHospital staff is linked to hospital id={first_hospital.id} ({first_hospital.name!r})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
