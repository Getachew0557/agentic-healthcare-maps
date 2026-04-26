"""
Import doctors from hack-nation `doctors_table.csv` (maps hospital_id to DB hospitals.external_id).

Usage (from backend/):
  python scripts/import_doctors_csv.py
  python scripts/import_doctors_csv.py --csv ../-agentic-healthcare-maps-hack-nation-Data-main/doctors_table.csv
  python scripts/import_doctors_csv.py --limit 2000
  python scripts/import_doctors_csv.py --clear   # wipe doctors + room assignments first
"""

from __future__ import annotations

import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital


def _norm_spec(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return "general_medicine"
    return s.lower().replace(" ", "_").replace("-", "_")


def _norm_phone(p: str) -> str | None:
    t = (p or "").strip()
    if not t:
        return None
    return t[:64]


def _full_name(row: dict) -> str:
    a = (row.get("first_name") or "").strip()
    b = (row.get("last_name") or "").strip()
    return f"{a} {b}".strip() or "Unknown"


def import_doctors(csv_path: str, *, clear: bool = False, limit: int | None = None) -> None:
    db: Session = SessionLocal()
    try:
        if "doctors" not in set(inspect(db.get_bind()).get_table_names()):
            print(
                "Table `doctors` is missing. Run: python -m alembic upgrade head\n"
                "If this persists, delete backend\\app.db and start the API once to run migrations."
            )
            return

        if clear:
            names = set(inspect(db.get_bind()).get_table_names())
            if "doctor_room_assignments" in names:
                db.query(DoctorRoomAssignment).delete()
            if "doctors" in names:
                db.query(Doctor).delete()
            db.commit()
            print("Cleared doctor tables (if present).")

        by_ext: dict[str, int] = {
            r[0]: r[1]
            for r in db.execute(
                select(Hospital.external_id, Hospital.id).where(Hospital.external_id.isnot(None))
            ).all()
        }

        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if limit is not None:
            rows = rows[:limit]

        added = 0
        skipped = 0
        missing_h = 0

        for i, row in enumerate(rows):
            hid = (row.get("hospital_id") or "").strip()
            if not hid or hid not in by_ext:
                missing_h += 1
                continue
            internal_hospital_id = by_ext[hid]
            name = _full_name(row)
            spec = _norm_spec(row.get("specialization") or "")

            twin = db.scalar(
                select(Doctor).where(
                    Doctor.hospital_id == internal_hospital_id,
                    Doctor.name == name,
                    Doctor.specialty == spec,
                )
            )
            if twin:
                skipped += 1
                continue

            db.add(
                Doctor(
                    hospital_id=internal_hospital_id,
                    name=name,
                    specialty=spec,
                    phone=_norm_phone(row.get("phone_number") or ""),
                )
            )
            added += 1
            if added % 200 == 0:
                db.commit()
                print(f"  {added} doctors committed...")

        db.commit()
        print(f"\nDoctors import done: added={added} skipped_dup={skipped} missing_hospital_ref={missing_h}")
    except Exception as exc:
        db.rollback()
        print(f"Import failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    here = os.path.dirname(__file__)
    default_csv = os.path.join(
        os.path.dirname(here),
        "..",
        "-agentic-healthcare-maps-hack-nation-Data-main",
        "doctors_table.csv",
    )
    default_csv = os.path.normpath(default_csv)
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default=default_csv, help="Path to doctors_table.csv")
    p.add_argument("--clear", action="store_true", help="Delete all doctors first")
    p.add_argument("--limit", type=int, default=None, help="Max rows to import (for quick dev)")
    a = p.parse_args()
    if not os.path.isfile(a.csv):
        print(f"File not found: {a.csv}\nCopy the hack-nation Data folder next to the repo or pass --csv.")
        sys.exit(1)
    import_doctors(a.csv, clear=a.clear, limit=a.limit)
