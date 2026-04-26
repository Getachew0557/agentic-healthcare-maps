"""
Load hack-nation CSVs: hospitals, specialties, Chroma reindex, and doctors (optional cap).

1. `healthcare_living_map_FINAL.csv` — hospitals (requires hospitals.external_id in DB from migration 0006)
2. `doctors_table.csv` — staff linked by external hospital_id

From `backend/`:
  python scripts/seed_hackathon_data.py
  python scripts/seed_hackathon_data.py --clear
  python scripts/seed_hackathon_data.py --data-dir ../-agentic-healthcare-maps-hack-nation-Data-main
  python scripts/seed_hackathon_data.py --no-doctors
  python scripts/seed_hackathon_data.py --no-chroma   # load DB only; reindex on next API start
  python scripts/seed_hackathon_data.py --doctor-limit 1500
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p = argparse.ArgumentParser(description="Seed DB + Chroma from hack-nation data folder")
    p.add_argument(
        "--data-dir",
        default=os.path.normpath(os.path.join(root, "..", "-agentic-healthcare-maps-hack-nation-Data-main")),
        help="Folder with healthcare_living_map_FINAL.csv and doctors_table.csv",
    )
    p.add_argument("--clear", action="store_true", help="Wipe hospitals (and with --import-doctors, doctors too)")
    p.add_argument("--no-doctors", action="store_true", help="Only hospitals + vector index")
    p.add_argument(
        "--no-chroma",
        action="store_true",
        help="Skip embedding/index step (faster; restart the API to run Chroma indexing)",
    )
    p.add_argument("--doctor-limit", type=int, default=2500, help="Max doctor rows (default 2500, use 0 for all)")
    args = p.parse_args()

    hospital_csv = os.path.join(args.data_dir, "healthcare_living_map_FINAL.csv")
    doctors_csv = os.path.join(args.data_dir, "doctors_table.csv")
    if not os.path.isfile(hospital_csv):
        print(f"Missing: {hospital_csv}")
        sys.exit(1)

    script_dir = os.path.join(root, "scripts")
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    import import_csv as import_hospitals_mod
    import import_doctors_csv as import_doctors_mod

    print("=== Importing hospitals from CSV ===")
    import_hospitals_mod.import_csv(hospital_csv, clear=args.clear)

    if not args.no_chroma:
        print("=== Rebuilding Chroma index (RAG) — this can take several minutes ===")
        from app.services.vector.embeddings import index_all_hospitals

        n = index_all_hospitals()
        print(f"Indexed {n} hospital documents into Chroma.")
    else:
        print("=== Skipping Chroma (use --no-chroma off, or start the API to index in the background) ===")

    if not args.no_doctors:
        if not os.path.isfile(doctors_csv):
            print(f"Skip doctors: no file {doctors_csv}")
            return
        dlim = args.doctor_limit if args.doctor_limit > 0 else None
        print("=== Importing doctors (linked by external_id) ===")
        import_doctors_mod.import_doctors(
            doctors_csv,
            clear=args.clear,
            limit=dlim,
        )


if __name__ == "__main__":
    _main()
