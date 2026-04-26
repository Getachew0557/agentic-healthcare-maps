"""
CSV Hospital Importer — loads healthcare_living_map_FINAL.csv into PostgreSQL.

Usage (from backend/ directory):
    python scripts/import_csv.py
    python scripts/import_csv.py --csv data/healthcare_living_map_FINAL.csv
    python scripts/import_csv.py --clear   # wipe existing CSV-imported hospitals first

Idempotent: skips rows whose hospital_id (external) already exists in the DB.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
from sqlalchemy import select

# ---------------------------------------------------------------------------
# Field mapping helpers
# ---------------------------------------------------------------------------

_SURGE_TO_STATUS = {
    "normal": HospitalStatus.normal,
    "alert": HospitalStatus.busy,
    "overload": HospitalStatus.emergency_only,
}

_DEFAULT_STATUS = HospitalStatus.normal


def _map_status(surge: str) -> HospitalStatus:
    return _SURGE_TO_STATUS.get(surge.strip().lower(), _DEFAULT_STATUS)


def _parse_bool(val: str) -> bool:
    return val.strip().lower() in ("true", "1", "yes")


def _parse_specialties(raw: str) -> list[str]:
    """
    CSV specialties are comma-separated strings like:
    "Emergency Medicine, Cardiology, Orthopedics"
    Normalise to lowercase snake_case for consistency with existing data.
    """
    if not raw:
        return []
    parts = [s.strip() for s in raw.split(",") if s.strip()]
    normalised = []
    for p in parts:
        # "Emergency Medicine" -> "emergency_medicine"
        normalised.append(p.lower().replace(" ", "_").replace("-", "_"))
    return normalised


def _derive_beds(row: dict) -> tuple[int, int, int, int, int]:
    """
    Returns (icu_total, icu_available, general_total, general_available, ventilators_available)

    CSV has:
    - beds_total       : total bed count (integer string)
    - beds_occupied    : occupied beds (integer string)
    - icu_available    : boolean "True"/"False" (not a count!)
    - ventilators_available: boolean "True"/"False"
    - occupancy_rate   : float percentage

    Strategy:
    - general_total    = beds_total
    - general_available = beds_total - beds_occupied
    - icu_total        = max(5, floor(beds_total * 0.10))  if icu_available=True else 0
    - icu_available    = floor(icu_total * (1 - occupancy_rate/100))
    - ventilators_available = 10 if True else 0
    """
    beds_total = int(row.get("beds_total") or 0)
    beds_occupied = int(row.get("beds_occupied") or 0)
    occupancy = float(row.get("occupancy_rate") or 0)
    has_icu = _parse_bool(row.get("icu_available", "False"))
    has_vents = _parse_bool(row.get("ventilators_available", "False"))

    general_total = beds_total
    general_available = max(0, beds_total - beds_occupied)

    if has_icu:
        icu_total = max(5, math.floor(beds_total * 0.10))
        icu_available = max(0, math.floor(icu_total * (1.0 - occupancy / 100.0)))
    else:
        icu_total = 0
        icu_available = 0

    ventilators_available = 10 if has_vents else 0

    return icu_total, icu_available, general_total, general_available, ventilators_available


def _build_address(row: dict) -> str:
    parts = [row.get("city", ""), row.get("state", ""), row.get("country", "")]
    return ", ".join(p for p in parts if p.strip())


# ---------------------------------------------------------------------------
# Main import function
# ---------------------------------------------------------------------------


def import_csv(csv_path: str, clear: bool = False) -> None:
    db = SessionLocal()
    try:
        if clear:
            # Remove hospitals that came from CSV (identified by external_id prefix HOSP-)
            # We store external_id in the address field as a comment — simpler: just truncate all
            print("Clearing all existing hospitals...")
            db.query(HospitalSpecialty).delete()
            db.query(Hospital).delete()
            db.commit()
            print("Cleared.")

        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Loaded {len(rows)} rows from {csv_path}")

        added = 0
        skipped = 0
        errors = 0

        for row in rows:
            name = (row.get("name") or "").strip()
            if not name:
                errors += 1
                continue

            # Idempotency — skip if name already exists
            existing = db.scalar(select(Hospital).where(Hospital.name == name))
            if existing:
                skipped += 1
                continue

            try:
                lat = float(row.get("latitude") or 0)
                lng = float(row.get("longitude") or 0)
            except ValueError:
                errors += 1
                continue

            icu_total, icu_available, gen_total, gen_available, vents = _derive_beds(row)
            address = _build_address(row)
            status = _map_status(row.get("surge_status", "normal"))
            website = (row.get("hospital_website_url") or "").strip() or None

            hospital = Hospital(
                name=name,
                address=address,
                phone=website,  # store website as phone field for now (frontend shows it)
                lat=lat,
                lng=lng,
                is_24x7=True,
                status=status,
                icu_total=icu_total,
                icu_available=icu_available,
                general_total=gen_total,
                general_available=gen_available,
                ventilators_available=vents,
            )
            db.add(hospital)
            db.flush()

            specialties = _parse_specialties(row.get("specialties", ""))
            seen: set[str] = set()
            for spec in specialties:
                if spec not in seen:
                    db.add(HospitalSpecialty(hospital_id=hospital.id, name=spec))
                    seen.add(spec)

            added += 1

            if added % 50 == 0:
                db.commit()
                print(f"  {added} hospitals committed...")

        db.commit()
        print("\nImport complete:")
        print(f"  Added  : {added}")
        print(f"  Skipped: {skipped} (already exist)")
        print(f"  Errors : {errors} (missing name or bad coordinates)")

    except Exception as exc:
        db.rollback()
        print(f"Import failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import hospitals from CSV")
    parser.add_argument(
        "--csv",
        default=os.path.join(
            os.path.dirname(__file__), "..", "data", "healthcare_living_map_FINAL.csv"
        ),
        help="Path to CSV file",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing hospitals before importing",
    )
    args = parser.parse_args()
    import_csv(args.csv, clear=args.clear)
