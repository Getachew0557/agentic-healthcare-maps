from __future__ import annotations

from sqlalchemy import or_
from app.models.doctor import Doctor


def _norm(t: str) -> str:
    return t.strip().lower().replace("-", "_").replace(" ", "_")


def doctor_specialty_match_terms(triage_specialty: str) -> list[str]:
    """
    Map triage specialty strings to substrings that may appear in Doctor.specialty
    (snake_case, Title Case, etc.).
    """
    k = _norm(triage_specialty)
    out: set[str] = {k, k.replace("_", " ")}
    expand: dict[str, tuple[str, ...]] = {
        "general_medicine": (
            "general_medicine",
            "internal_medicine",
            "family_medicine",
            "internal medicine",
            "family medicine",
            "general medicine",
        ),
        "pediatrics": ("pediatrics", "paediatrics", "pediatric"),
        "paediatrics": ("pediatrics", "paediatrics", "pediatric"),
        "emergency_medicine": ("emergency", "emergency_medicine", "emergency medicine", "trauma"),
        "emergency": ("emergency", "emergency_medicine", "emergency medicine", "trauma"),
        "neurology": ("neurology", "neuro"),
        "cardiology": ("cardiology", "cardiac", "heart"),
        "oncology": ("oncology", "cancer"),
        "gynecology": ("gynecology", "gynaecology", "obstetric", "obstetrics"),
        "obstetrics": ("obstetric", "obstetrics", "gynecology", "gynaecology"),
        "surgery": ("surgery", "surgical", "transplant"),
        "trauma": ("trauma", "emergency", "orthopedic", "orthopaedic", "surgery"),
        "dermatology": ("dermatology", "derma", "skin"),
    }
    if k in expand:
        out.update(expand[k])
    cleaned = [t for t in out if t and len(t) >= 2]
    return cleaned or ([k] if k else ["general_medicine"])


def doctor_specialty_match_or(specialty: str):
    terms = doctor_specialty_match_terms(specialty)
    if len(terms) == 1:
        return Doctor.specialty.ilike(f"%{terms[0]}%")
    return or_(*[Doctor.specialty.ilike(f"%{t}%") for t in terms])
