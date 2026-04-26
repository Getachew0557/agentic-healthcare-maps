"""
Seed script — 55 realistic Mumbai/Pune hospitals.

Usage (from backend/ directory):
    python scripts/seed.py

Idempotent: skips hospitals whose name already exists.
"""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty

# ---------------------------------------------------------------------------
# Seed data — (name, address, lat, lng, phone, is_24x7, status,
#              icu_total, icu_avail, gen_total, gen_avail, vents, specialties)
# ---------------------------------------------------------------------------

HOSPITALS = [
    # --- Mumbai ---
    ("Lilavati Hospital", "Bandra West, Mumbai", 19.0596, 72.8295, "+91-22-26751000", True, "normal", 40, 12, 300, 87, 8, ["cardiology", "neurology", "oncology", "orthopedics", "emergency"]),
    ("Kokilaben Dhirubhai Ambani Hospital", "Andheri West, Mumbai", 19.1197, 72.8397, "+91-22-30999999", True, "normal", 60, 18, 450, 120, 12, ["cardiology", "neurology", "oncology", "transplant", "emergency"]),
    ("Hinduja Hospital", "Mahim, Mumbai", 19.0390, 72.8397, "+91-22-24452222", True, "normal", 50, 14, 350, 95, 10, ["cardiology", "gastroenterology", "nephrology", "emergency"]),
    ("Breach Candy Hospital", "Breach Candy, Mumbai", 18.9726, 72.8082, "+91-22-23667888", True, "normal", 30, 8, 200, 55, 6, ["cardiology", "orthopedics", "general_medicine"]),
    ("Jaslok Hospital", "Pedder Road, Mumbai", 18.9726, 72.8082, "+91-22-66573333", True, "normal", 45, 10, 280, 70, 9, ["cardiology", "neurology", "oncology", "emergency"]),
    ("Nanavati Max Super Speciality Hospital", "Vile Parle West, Mumbai", 19.0990, 72.8397, "+91-22-26267500", True, "normal", 55, 16, 400, 110, 11, ["cardiology", "orthopedics", "oncology", "emergency"]),
    ("Wockhardt Hospital", "South Mumbai", 18.9550, 72.8258, "+91-22-61784444", True, "busy", 35, 4, 250, 30, 7, ["cardiology", "neurology", "emergency"]),
    ("Bombay Hospital", "Marine Lines, Mumbai", 18.9440, 72.8258, "+91-22-22067676", True, "normal", 40, 11, 320, 88, 8, ["cardiology", "general_medicine", "pediatrics", "emergency"]),
    ("KEM Hospital", "Parel, Mumbai", 19.0000, 72.8397, "+91-22-24136051", True, "normal", 80, 22, 800, 210, 15, ["emergency", "trauma", "general_medicine", "pediatrics", "neurology"]),
    ("Sion Hospital", "Sion, Mumbai", 19.0390, 72.8620, "+91-22-24076381", True, "busy", 70, 5, 700, 45, 12, ["emergency", "trauma", "general_medicine", "pediatrics"]),
    ("Nair Hospital", "Mumbai Central", 18.9726, 72.8258, "+91-22-23027600", True, "normal", 60, 18, 600, 160, 10, ["emergency", "general_medicine", "orthopedics", "pediatrics"]),
    ("Tata Memorial Hospital", "Parel, Mumbai", 19.0000, 72.8397, "+91-22-24177000", True, "normal", 50, 14, 400, 100, 8, ["oncology", "radiology", "general_medicine"]),
    ("Fortis Hospital Mulund", "Mulund West, Mumbai", 19.1726, 72.9620, "+91-22-67971111", True, "normal", 30, 9, 200, 58, 6, ["cardiology", "orthopedics", "emergency"]),
    ("Apollo Hospital Navi Mumbai", "Belapur, Navi Mumbai", 19.0170, 73.0297, "+91-22-27570000", True, "normal", 40, 12, 300, 82, 8, ["cardiology", "neurology", "oncology", "emergency"]),
    ("MGM Hospital Navi Mumbai", "Kamothe, Navi Mumbai", 19.0390, 73.0620, "+91-22-27436000", True, "normal", 35, 10, 250, 68, 7, ["general_medicine", "pediatrics", "orthopedics", "emergency"]),
    ("Hiranandani Hospital", "Powai, Mumbai", 19.1197, 72.9082, "+91-22-25763300", True, "normal", 25, 7, 180, 50, 5, ["cardiology", "general_medicine", "pediatrics"]),
    ("Criticare Hospital", "Juhu, Mumbai", 19.0990, 72.8258, "+91-22-26703000", True, "normal", 20, 6, 150, 42, 4, ["emergency", "general_medicine", "cardiology"]),
    ("Holy Family Hospital", "Bandra East, Mumbai", 19.0596, 72.8620, "+91-22-26551000", True, "normal", 25, 8, 200, 55, 5, ["general_medicine", "pediatrics", "gynecology"]),
    ("Saifee Hospital", "Charni Road, Mumbai", 18.9550, 72.8258, "+91-22-67570111", True, "normal", 30, 9, 220, 60, 6, ["cardiology", "orthopedics", "general_medicine"]),
    ("Bhatia Hospital", "Tardeo, Mumbai", 18.9726, 72.8082, "+91-22-23619191", True, "normal", 20, 5, 160, 44, 4, ["general_medicine", "gynecology", "pediatrics"]),
    ("Raheja Hospital", "Mahim, Mumbai", 19.0390, 72.8397, "+91-22-24452000", True, "normal", 25, 7, 180, 50, 5, ["cardiology", "general_medicine", "emergency"]),
    ("Surya Hospital", "Santacruz West, Mumbai", 19.0826, 72.8397, "+91-22-26001000", True, "normal", 15, 4, 120, 35, 3, ["pediatrics", "neonatology", "gynecology"]),
    ("Zen Multispeciality Hospital", "Chembur, Mumbai", 19.0596, 72.9082, "+91-22-25208888", True, "normal", 20, 6, 150, 42, 4, ["cardiology", "orthopedics", "general_medicine"]),
    ("Asha Parekh Hospital", "Santacruz West, Mumbai", 19.0826, 72.8258, "+91-22-26001234", True, "normal", 10, 3, 80, 22, 2, ["general_medicine", "gynecology"]),
    ("Masina Hospital", "Byculla, Mumbai", 18.9726, 72.8397, "+91-22-23027777", True, "normal", 15, 4, 120, 33, 3, ["general_medicine", "pediatrics", "emergency"]),
    # --- Pune ---
    ("Ruby Hall Clinic", "Sassoon Road, Pune", 18.5204, 73.8567, "+91-20-66455100", True, "normal", 50, 15, 400, 110, 10, ["cardiology", "neurology", "oncology", "emergency"]),
    ("Jehangir Hospital", "Sassoon Road, Pune", 18.5204, 73.8567, "+91-20-66814444", True, "normal", 45, 13, 350, 95, 9, ["cardiology", "orthopedics", "general_medicine", "emergency"]),
    ("Deenanath Mangeshkar Hospital", "Erandwane, Pune", 18.5074, 73.8258, "+91-20-49150000", True, "normal", 60, 18, 500, 135, 12, ["cardiology", "neurology", "oncology", "transplant", "emergency"]),
    ("Sahyadri Hospital Deccan", "Deccan Gymkhana, Pune", 18.5204, 73.8397, "+91-20-67213000", True, "normal", 40, 11, 300, 82, 8, ["cardiology", "orthopedics", "emergency"]),
    ("KEM Hospital Pune", "Rasta Peth, Pune", 18.5074, 73.8620, "+91-20-26128000", True, "normal", 70, 20, 700, 190, 14, ["emergency", "trauma", "general_medicine", "pediatrics"]),
    ("Sassoon General Hospital", "Pune Station, Pune", 18.5204, 73.8620, "+91-20-26128000", True, "busy", 80, 6, 800, 50, 15, ["emergency", "trauma", "general_medicine"]),
    ("Poona Hospital", "Sadashiv Peth, Pune", 18.5074, 73.8567, "+91-20-24330000", True, "normal", 30, 9, 250, 68, 6, ["general_medicine", "pediatrics", "gynecology"]),
    ("Inamdar Multispeciality Hospital", "Fatima Nagar, Pune", 18.4911, 73.8897, "+91-20-67220000", True, "normal", 35, 10, 280, 76, 7, ["cardiology", "orthopedics", "general_medicine"]),
    ("Aditya Birla Memorial Hospital", "Chinchwad, Pune", 18.6298, 73.7997, "+91-20-30715000", True, "normal", 50, 14, 400, 108, 10, ["cardiology", "neurology", "oncology", "emergency"]),
    ("Columbia Asia Hospital Pune", "Kharadi, Pune", 18.5515, 73.9397, "+91-20-67250000", True, "normal", 30, 9, 220, 60, 6, ["cardiology", "orthopedics", "general_medicine"]),
    ("Manipal Hospital Pune", "Baner, Pune", 18.5515, 73.7997, "+91-20-67490000", True, "normal", 35, 10, 260, 70, 7, ["cardiology", "neurology", "emergency"]),
    ("Fortis Hospital Pune", "Viman Nagar, Pune", 18.5515, 73.9082, "+91-20-67116000", True, "normal", 40, 12, 300, 82, 8, ["cardiology", "orthopedics", "oncology", "emergency"]),
    ("Noble Hospital", "Hadapsar, Pune", 18.5074, 73.9397, "+91-20-66800000", True, "normal", 25, 7, 200, 55, 5, ["general_medicine", "pediatrics", "emergency"]),
    ("Sanjeevan Hospital", "Kothrud, Pune", 18.5074, 73.8082, "+91-20-25460000", True, "normal", 20, 6, 160, 44, 4, ["general_medicine", "gynecology", "pediatrics"]),
    ("Inlaks and Budhrani Hospital", "Koregaon Park, Pune", 18.5360, 73.8897, "+91-20-66020000", True, "normal", 30, 8, 220, 60, 6, ["cardiology", "general_medicine", "emergency"]),
    ("Oyster and Pearl Hospital", "Pimpri, Pune", 18.6298, 73.8082, "+91-20-27420000", True, "normal", 20, 5, 150, 40, 4, ["general_medicine", "pediatrics", "gynecology"]),
    ("Lokmanya Hospital", "Chinchwad, Pune", 18.6298, 73.7997, "+91-20-27650000", True, "normal", 25, 7, 180, 50, 5, ["general_medicine", "orthopedics", "emergency"]),
    ("Surya Mother and Child Care", "Wakad, Pune", 18.5980, 73.7620, "+91-20-67290000", True, "normal", 15, 4, 120, 33, 3, ["pediatrics", "neonatology", "gynecology"]),
    ("Medipoint Hospital", "Aundh, Pune", 18.5515, 73.8082, "+91-20-25880000", True, "normal", 20, 6, 150, 42, 4, ["general_medicine", "cardiology", "orthopedics"]),
    ("Shree Hospital", "Dhankawadi, Pune", 18.4748, 73.8567, "+91-20-24390000", True, "normal", 15, 4, 120, 33, 3, ["general_medicine", "pediatrics"]),
    ("Hardikar Hospital", "Model Colony, Pune", 18.5204, 73.8258, "+91-20-25660000", True, "normal", 10, 3, 80, 22, 2, ["general_medicine", "gynecology"]),
    ("Ratna Memorial Hospital", "Warje, Pune", 18.4911, 73.7997, "+91-20-25230000", True, "normal", 15, 4, 100, 28, 3, ["general_medicine", "pediatrics", "emergency"]),
    ("Symbiosis University Hospital", "Lavale, Pune", 18.5360, 73.7620, "+91-20-61936000", True, "normal", 30, 9, 200, 55, 6, ["general_medicine", "emergency", "orthopedics"]),
    ("Yashwantrao Chavan Memorial Hospital", "Pimpri, Pune", 18.6298, 73.8082, "+91-20-27742000", True, "normal", 60, 17, 600, 162, 12, ["emergency", "trauma", "general_medicine", "pediatrics"]),
    ("Joshi Hospital", "Navi Peth, Pune", 18.5074, 73.8620, "+91-20-24470000", True, "normal", 10, 3, 80, 22, 2, ["general_medicine", "gynecology"]),
    ("Chellaram Hospital", "Bavdhan, Pune", 18.5204, 73.7820, "+91-20-66800100", True, "normal", 20, 6, 150, 42, 4, ["cardiology", "general_medicine", "orthopedics"]),
    ("Sai Sneh Hospital", "Hadapsar, Pune", 18.5074, 73.9397, "+91-20-26990000", True, "normal", 10, 3, 80, 22, 2, ["general_medicine", "pediatrics"]),
    ("Pawana Hospital", "Nigdi, Pune", 18.6480, 73.7820, "+91-20-27650100", True, "normal", 15, 4, 100, 28, 3, ["general_medicine", "emergency"]),
]


def seed() -> None:
    db = SessionLocal()
    try:
        added = 0
        skipped = 0
        for row in HOSPITALS:
            (name, address, lat, lng, phone, is_24x7, status_str,
             icu_total, icu_avail, gen_total, gen_avail, vents, specialties) = row

            # Idempotency check
            from sqlalchemy import select
            existing = db.scalar(select(Hospital).where(Hospital.name == name))
            if existing:
                skipped += 1
                continue

            hospital = Hospital(
                name=name,
                address=address,
                lat=lat,
                lng=lng,
                phone=phone,
                is_24x7=is_24x7,
                status=HospitalStatus(status_str),
                icu_total=icu_total,
                icu_available=icu_avail,
                general_total=gen_total,
                general_available=gen_avail,
                ventilators_available=vents,
            )
            db.add(hospital)
            db.flush()  # get hospital.id

            for spec_name in specialties:
                db.add(HospitalSpecialty(hospital_id=hospital.id, name=spec_name))

            added += 1

        db.commit()
        print(f"Seed complete: {added} hospitals added, {skipped} skipped (already exist).")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
