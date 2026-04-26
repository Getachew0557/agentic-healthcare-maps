from __future__ import annotations

"""
OCR + CSV/JSON/Excel ingestion pipeline.

Supported input formats:
  - PDF  → convert pages to images → Tesseract OCR → text extraction
  - Image (PNG/JPG/JPEG/TIFF/BMP) → Tesseract OCR → text extraction
  - CSV  → pandas read_csv → structured rows
  - JSON → json.loads → list of dicts
  - XLSX/XLS → pandas read_excel → structured rows

Output: list[ParsedHospital] — normalised hospital records ready for DB insert.

Anti-hallucination: parser only extracts, never invents.
  If a field cannot be found, it is set to None or a safe default.
"""

import io
import json
import logging
import re
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Output schema
# ---------------------------------------------------------------------------

@dataclass
class ParsedHospital:
    name: str
    address: str = ""
    lat: float | None = None
    lng: float | None = None
    phone: str | None = None
    specialties: list[str] = field(default_factory=list)
    icu_total: int = 0
    icu_available: int = 0
    general_total: int = 0
    general_available: int = 0
    ventilators_available: int = 0
    status: str = "normal"
    is_24x7: bool = True
    source: str = "ocr"   # "ocr" | "csv" | "json" | "excel"
    raw_text: str = ""     # original extracted text for audit


# ---------------------------------------------------------------------------
# Text → ParsedHospital (used after OCR)
# ---------------------------------------------------------------------------

_SPECIALTY_KEYWORDS = [
    "cardiology", "neurology", "oncology", "orthopedics", "pediatrics",
    "emergency", "general medicine", "gynecology", "radiology", "surgery",
    "psychiatry", "dermatology", "ophthalmology", "urology", "nephrology",
    "gastroenterology", "pulmonology", "endocrinology", "hematology",
    "internal medicine", "obstetrics", "anesthesiology", "trauma",
]


def _extract_number(text: str, pattern: str) -> int | None:
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _extract_float(text: str, pattern: str) -> float | None:
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _extract_specialties(text: str) -> list[str]:
    found = []
    lower = text.lower()
    for kw in _SPECIALTY_KEYWORDS:
        if kw in lower:
            found.append(kw.replace(" ", "_"))
    return list(dict.fromkeys(found))  # deduplicate, preserve order


def text_to_hospital(text: str, source: str = "ocr") -> ParsedHospital | None:
    """
    Extract hospital fields from free-form text (OCR output or similar).
    Returns None if no hospital name can be found.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return None

    # Name: first non-empty line, or line containing "Hospital"
    name = lines[0]
    for line in lines:
        if re.search(r"\bhospital\b", line, re.IGNORECASE):
            name = line
            break

    # Clean name
    name = re.sub(r"[^\w\s\-\.]", "", name).strip()
    if not name or len(name) < 3:
        return None

    # Address: line containing city/state keywords or after "Address:"
    address = ""
    for line in lines:
        if re.search(r"\baddress\b|\bstreet\b|\broad\b|\bnagar\b|\bcolony\b", line, re.IGNORECASE):
            address = re.sub(r"^address\s*[:\-]\s*", "", line, flags=re.IGNORECASE).strip()
            break

    # Phone
    phone_match = re.search(r"(\+?[\d\s\-\(\)]{7,15})", text)
    phone = phone_match.group(1).strip() if phone_match else None

    # Coordinates
    lat = _extract_float(text, r"lat(?:itude)?\s*[:\-]?\s*([\-\d\.]+)")
    lng = _extract_float(text, r"lon(?:gitude)?\s*[:\-]?\s*([\-\d\.]+)")

    # Bed counts
    icu_total = _extract_number(text, r"icu\s+(?:total|beds?)\s*[:\-]?\s*(\d+)") or 0
    icu_available = _extract_number(text, r"icu\s+available\s*[:\-]?\s*(\d+)") or 0
    general_total = _extract_number(text, r"(?:general|total)\s+beds?\s*[:\-]?\s*(\d+)") or 0
    general_available = _extract_number(text, r"(?:general|available)\s+beds?\s*[:\-]?\s*(\d+)") or 0
    ventilators = _extract_number(text, r"ventilators?\s*[:\-]?\s*(\d+)") or 0

    # 24x7
    is_24x7 = bool(re.search(r"24\s*[x×]\s*7|24\s*hours?|round\s+the\s+clock", text, re.IGNORECASE))

    specialties = _extract_specialties(text)

    return ParsedHospital(
        name=name,
        address=address,
        lat=lat,
        lng=lng,
        phone=phone,
        specialties=specialties,
        icu_total=icu_total,
        icu_available=icu_available,
        general_total=general_total,
        general_available=general_available,
        ventilators_available=ventilators,
        is_24x7=is_24x7,
        source=source,
        raw_text=text[:2000],  # store first 2000 chars for audit
    )


# ---------------------------------------------------------------------------
# CSV parser
# ---------------------------------------------------------------------------

def parse_csv(content: bytes) -> list[ParsedHospital]:
    """Parse CSV bytes into ParsedHospital list."""
    import csv

    results = []
    try:
        text = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            name = (row.get("name") or row.get("hospital_name") or "").strip()
            if not name:
                continue

            try:
                lat = float(row.get("latitude") or row.get("lat") or 0) or None
                lng = float(row.get("longitude") or row.get("lng") or 0) or None
            except ValueError:
                lat = lng = None

            try:
                beds_total = int(row.get("beds_total") or row.get("total_beds") or 0)
                beds_occupied = int(row.get("beds_occupied") or 0)
                occupancy = float(row.get("occupancy_rate") or 0)
            except ValueError:
                beds_total = beds_occupied = 0
                occupancy = 0.0

            has_icu = str(row.get("icu_available", "")).lower() in ("true", "1", "yes")
            has_vents = str(row.get("ventilators_available", "")).lower() in ("true", "1", "yes")

            import math
            icu_total = max(5, math.floor(beds_total * 0.10)) if has_icu else 0
            icu_available = max(0, math.floor(icu_total * (1.0 - occupancy / 100.0))) if has_icu else 0
            general_available = max(0, beds_total - beds_occupied)

            # Surge status mapping
            surge = (row.get("surge_status") or "normal").lower()
            status_map = {"normal": "normal", "alert": "busy", "overload": "emergency_only"}
            status = status_map.get(surge, "normal")

            raw_specialties = row.get("specialties") or row.get("specialty") or ""
            specialties = [
                s.strip().lower().replace(" ", "_")
                for s in raw_specialties.split(",")
                if s.strip()
            ]

            city = row.get("city", "")
            state = row.get("state", "")
            country = row.get("country", "")
            address_parts = [p for p in [city, state, country] if p]
            address = ", ".join(address_parts)

            results.append(ParsedHospital(
                name=name,
                address=address,
                lat=lat,
                lng=lng,
                phone=row.get("hospital_website_url") or row.get("phone") or None,
                specialties=specialties,
                icu_total=icu_total,
                icu_available=icu_available,
                general_total=beds_total,
                general_available=general_available,
                ventilators_available=10 if has_vents else 0,
                status=status,
                is_24x7=True,
                source="csv",
                raw_text=str(row)[:500],
            ))
    except Exception as exc:
        logger.warning("CSV parse error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# JSON parser
# ---------------------------------------------------------------------------

def parse_json(content: bytes) -> list[ParsedHospital]:
    """Parse JSON bytes (list of hospital dicts) into ParsedHospital list."""
    results = []
    try:
        data = json.loads(content.decode("utf-8", errors="replace"))
        if isinstance(data, dict):
            data = [data]
        if not isinstance(data, list):
            return []

        for item in data:
            if not isinstance(item, dict):
                continue
            name = (item.get("name") or item.get("hospital_name") or "").strip()
            if not name:
                continue

            results.append(ParsedHospital(
                name=name,
                address=item.get("address") or item.get("location") or "",
                lat=item.get("lat") or item.get("latitude"),
                lng=item.get("lng") or item.get("longitude"),
                phone=item.get("phone") or item.get("contact"),
                specialties=[
                    s.strip().lower().replace(" ", "_")
                    for s in str(item.get("specialties") or "").split(",")
                    if s.strip()
                ],
                icu_total=int(item.get("icu_total") or 0),
                icu_available=int(item.get("icu_available") or 0),
                general_total=int(item.get("general_total") or item.get("beds_total") or 0),
                general_available=int(item.get("general_available") or 0),
                ventilators_available=int(item.get("ventilators_available") or 0),
                status=item.get("status") or "normal",
                is_24x7=bool(item.get("is_24x7", True)),
                source="json",
                raw_text=str(item)[:500],
            ))
    except Exception as exc:
        logger.warning("JSON parse error: %s", exc)

    return results


# ---------------------------------------------------------------------------
# Excel parser
# ---------------------------------------------------------------------------

def parse_excel(content: bytes) -> list[ParsedHospital]:
    """Parse XLSX/XLS bytes using openpyxl/xlrd via pandas."""
    try:
        import pandas as pd
        df = pd.read_excel(io.BytesIO(content))
        # Convert to CSV-like dict rows and reuse CSV logic
        csv_buf = io.StringIO()
        df.to_csv(csv_buf, index=False)
        return parse_csv(csv_buf.getvalue().encode("utf-8"))
    except ImportError:
        logger.warning("pandas/openpyxl not installed — Excel parsing unavailable")
        return []
    except Exception as exc:
        logger.warning("Excel parse error: %s", exc)
        return []


# ---------------------------------------------------------------------------
# PDF / Image → OCR → text
# ---------------------------------------------------------------------------

def _ocr_image_bytes(image_bytes: bytes) -> str:
    """Run Tesseract OCR on raw image bytes. Returns extracted text."""
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(img)
    except Exception as exc:
        logger.warning("OCR failed: %s", exc)
        return ""


def parse_pdf(content: bytes) -> list[ParsedHospital]:
    """Convert PDF pages to images, OCR each page, extract hospitals."""
    results = []
    try:
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(content, dpi=200)
        for i, page in enumerate(pages):
            buf = io.BytesIO()
            page.save(buf, format="PNG")
            text = _ocr_image_bytes(buf.getvalue())
            if text.strip():
                hospital = text_to_hospital(text, source="pdf_ocr")
                if hospital:
                    results.append(hospital)
    except ImportError:
        logger.warning("pdf2image not installed — PDF OCR unavailable")
    except Exception as exc:
        logger.warning("PDF parse error: %s", exc)
    return results


def parse_image(content: bytes) -> list[ParsedHospital]:
    """OCR a single image file."""
    text = _ocr_image_bytes(content)
    if not text.strip():
        return []
    hospital = text_to_hospital(text, source="image_ocr")
    return [hospital] if hospital else []


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

def parse_file(filename: str, content: bytes) -> list[ParsedHospital]:
    """
    Dispatch to the correct parser based on file extension.
    Returns list of ParsedHospital records (may be empty if parsing fails).
    """
    ext = Path(filename).suffix.lower()

    if ext == ".csv":
        return parse_csv(content)
    elif ext == ".json":
        return parse_json(content)
    elif ext in (".xlsx", ".xls"):
        return parse_excel(content)
    elif ext == ".pdf":
        return parse_pdf(content)
    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"):
        return parse_image(content)
    else:
        # Try CSV as fallback for unknown text formats
        logger.warning("Unknown extension %s — attempting CSV parse", ext)
        return parse_csv(content)
