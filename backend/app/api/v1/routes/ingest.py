from __future__ import annotations

"""
POST /api/v1/admin/ingest

Upload a hospital data file (CSV, JSON, XLSX, PDF, or image).
The endpoint:
  1. Parses the file using the OCR/parser pipeline
  2. Returns a preview of parsed records (no DB write yet)
  3. On confirm=true, inserts into PostgreSQL + indexes into Chroma

This is the "messy data superpower" demo feature.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.db.session import get_db
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
from app.models.user import User, UserRole
from app.services.ocr.parser import ParsedHospital, parse_file

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ParsedHospitalPreview(BaseModel):
    name: str
    address: str
    lat: float | None
    lng: float | None
    phone: str | None
    specialties: list[str]
    icu_total: int
    icu_available: int
    general_total: int
    general_available: int
    ventilators_available: int
    status: str
    is_24x7: bool
    source: str


class IngestResponse(BaseModel):
    filename: str
    total_parsed: int
    total_inserted: int
    total_skipped: int
    preview: list[ParsedHospitalPreview]
    message: str


# ---------------------------------------------------------------------------
# POST /admin/ingest
# ---------------------------------------------------------------------------

@router.post(
    "/ingest",
    response_model=IngestResponse,
    summary="Ingest hospital records from file (OCR / CSV / JSON / Excel)",
    description="""
Upload a hospital data file and parse it into structured records.

**Supported formats:**
- `.csv` — comma-separated hospital data (e.g. `healthcare_living_map_FINAL.csv`)
- `.json` — list of hospital objects
- `.xlsx` / `.xls` — Excel spreadsheet
- `.pdf` — scanned document (Tesseract OCR)
- `.png` / `.jpg` / `.jpeg` / `.tiff` — photo of handwritten register (Tesseract OCR)

**Workflow:**
1. Upload file → get preview of parsed records (no DB write)
2. If preview looks correct, call again with `confirm=true` to insert into DB

**Demo scenario:**
Upload `healthcare_living_map_FINAL.csv` to instantly load 284 real hospitals.

**Requires JWT** — `admin` role only.
    """,
    responses={
        200: {"description": "Parsed preview or confirmed insert"},
        400: {"description": "File too large or unsupported format"},
        401: {"description": "Missing or invalid token"},
        403: {"description": "Admin role required"},
    },
)
async def ingest_file(
    file: UploadFile = File(..., description="Hospital data file"),
    confirm: bool = Query(False, description="Set true to actually insert into DB"),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> IngestResponse:
    # --- Read file ---
    content = await file.read()
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content) // 1024}KB). Max 20MB.",
        )

    filename = file.filename or "upload"
    logger.info("Ingesting file: %s (%d bytes), confirm=%s", filename, len(content), confirm)

    # --- Parse ---
    parsed: list[ParsedHospital] = parse_file(filename, content)

    if not parsed:
        raise HTTPException(
            status_code=400,
            detail=f"No hospital records could be extracted from '{filename}'. "
                   f"Check the file format and content.",
        )

    preview = [
        ParsedHospitalPreview(
            name=h.name,
            address=h.address,
            lat=h.lat,
            lng=h.lng,
            phone=h.phone,
            specialties=h.specialties,
            icu_total=h.icu_total,
            icu_available=h.icu_available,
            general_total=h.general_total,
            general_available=h.general_available,
            ventilators_available=h.ventilators_available,
            status=h.status,
            is_24x7=h.is_24x7,
            source=h.source,
        )
        for h in parsed[:10]  # preview first 10
    ]

    if not confirm:
        return IngestResponse(
            filename=filename,
            total_parsed=len(parsed),
            total_inserted=0,
            total_skipped=0,
            preview=preview,
            message=(
                f"Preview only — {len(parsed)} records parsed from '{filename}'. "
                f"Call again with confirm=true to insert into the database."
            ),
        )

    # --- Insert into DB ---
    inserted = 0
    skipped = 0

    for h in parsed:
        # Idempotency — skip if name already exists
        existing = db.scalar(select(Hospital).where(Hospital.name == h.name))
        if existing:
            skipped += 1
            continue

        # Validate coordinates
        if h.lat is None or h.lng is None:
            logger.warning("Skipping '%s' — missing coordinates", h.name)
            skipped += 1
            continue

        try:
            status_enum = HospitalStatus(h.status)
        except ValueError:
            status_enum = HospitalStatus.normal

        hospital = Hospital(
            name=h.name,
            address=h.address,
            phone=h.phone,
            lat=h.lat,
            lng=h.lng,
            is_24x7=h.is_24x7,
            status=status_enum,
            icu_total=h.icu_total,
            icu_available=h.icu_available,
            general_total=h.general_total,
            general_available=h.general_available,
            ventilators_available=h.ventilators_available,
        )
        db.add(hospital)
        db.flush()  # get hospital.id

        seen_specs: set[str] = set()
        for spec in h.specialties:
            if spec and spec not in seen_specs:
                db.add(HospitalSpecialty(hospital_id=hospital.id, name=spec))
                seen_specs.add(spec)

        inserted += 1

        # Commit in batches of 50
        if inserted % 50 == 0:
            db.commit()

    db.commit()

    # --- Re-index new hospitals in Chroma (best-effort) ---
    try:
        from app.services.vector.embeddings import index_hospital
        # Re-query the just-inserted hospitals to get their IDs
        for h in parsed:
            hospital_row = db.scalar(select(Hospital).where(Hospital.name == h.name))
            if hospital_row:
                specs = list(db.scalars(
                    select(HospitalSpecialty.name).where(
                        HospitalSpecialty.hospital_id == hospital_row.id
                    )
                ).all())
                parts = [p.strip() for p in hospital_row.address.split(",")]
                index_hospital(
                    hospital_id=hospital_row.id,
                    name=hospital_row.name,
                    address=hospital_row.address,
                    specialties=specs,
                    status=hospital_row.status.value,
                    icu_available=hospital_row.icu_available,
                    general_available=hospital_row.general_available,
                    ventilators_available=hospital_row.ventilators_available,
                    is_24x7=hospital_row.is_24x7,
                    phone=hospital_row.phone,
                    website=hospital_row.website,
                    city=parts[0] if parts else "",
                    country=parts[-1] if len(parts) > 1 else "",
                )
    except Exception as exc:
        logger.warning("Chroma re-index after ingest failed (non-fatal): %s", exc)

    return IngestResponse(
        filename=filename,
        total_parsed=len(parsed),
        total_inserted=inserted,
        total_skipped=skipped,
        preview=preview,
        message=(
            f"Successfully inserted {inserted} hospitals from '{filename}'. "
            f"{skipped} skipped (already exist or missing coordinates). "
            f"Vector index updated."
        ),
    )
