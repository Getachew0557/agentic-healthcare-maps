"""Tests for OCR/CSV/JSON ingestion endpoint and parser."""
from __future__ import annotations

import json
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole
from app.core.security import create_access_token, hash_password

from app.core.config import settings as _settings
TEST_DB_URL = _settings.test_database_url
_engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
_TestSession = sessionmaker(bind=_engine, autocommit=False, autoflush=False)
Base.metadata.create_all(bind=_engine)


def _override_get_db():
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _wipe():
    db = _TestSession()
    try:
        db.execute(text(
            "TRUNCATE TABLE doctor_room_assignments, doctors, availability_logs, "
            "hospital_specialties, users, hospitals RESTART IDENTITY CASCADE"
        ))
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture()
def db():
    s = _TestSession()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture()
def admin_user(db):
    u = User(email="admin@sys.com", password_hash=hash_password("pass"), role=UserRole.admin)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture()
def staff_user(db):
    u = User(email="staff@sys.com", password_hash=hash_password("pass"), role=UserRole.hospital_staff)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _tok(user):
    return create_access_token(subject=str(user.id))


# ---------------------------------------------------------------------------
# Parser unit tests
# ---------------------------------------------------------------------------

def test_parse_csv_bytes():
    from app.services.ocr.parser import parse_csv
    csv_content = b"""name,city,state,country,latitude,longitude,specialties,beds_total,beds_occupied,icu_available,ventilators_available,surge_status,occupancy_rate
Test Hospital,Mumbai,Maharashtra,India,19.076,72.877,"Cardiology, Emergency",100,60,True,True,normal,60.0
"""
    results = parse_csv(csv_content)
    assert len(results) == 1
    h = results[0]
    assert h.name == "Test Hospital"
    assert h.lat == 19.076
    assert h.lng == 72.877
    assert "cardiology" in h.specialties
    assert h.general_total == 100
    assert h.general_available == 40
    assert h.icu_total > 0
    assert h.source == "csv"


def test_parse_json_bytes():
    from app.services.ocr.parser import parse_json
    data = [
        {
            "name": "JSON Hospital",
            "address": "Delhi, India",
            "lat": 28.6,
            "lng": 77.2,
            "specialties": "neurology, pediatrics",
            "icu_total": 10,
            "icu_available": 5,
            "general_total": 50,
            "general_available": 20,
            "ventilators_available": 3,
            "status": "normal",
            "is_24x7": True,
        }
    ]
    results = parse_json(json.dumps(data).encode())
    assert len(results) == 1
    h = results[0]
    assert h.name == "JSON Hospital"
    assert h.lat == 28.6
    assert "neurology" in h.specialties
    assert h.icu_available == 5
    assert h.source == "json"


def test_parse_text_to_hospital():
    from app.services.ocr.parser import text_to_hospital
    text = """
    City General Hospital
    Address: 123 Main Road, Mumbai
    ICU Total: 20
    ICU Available: 8
    General Beds: 150
    Available Beds: 60
    Ventilators: 5
    Specialties: Cardiology, Emergency Medicine, Neurology
    Open 24x7
    """
    h = text_to_hospital(text)
    assert h is not None
    assert "hospital" in h.name.lower()
    assert h.icu_total == 20
    assert h.icu_available == 8
    assert h.ventilators_available == 5
    assert h.is_24x7 is True
    assert "cardiology" in h.specialties


def test_parse_empty_returns_none():
    from app.services.ocr.parser import text_to_hospital
    result = text_to_hospital("")
    assert result is None


def test_parse_csv_skips_missing_name():
    from app.services.ocr.parser import parse_csv
    csv_content = b"name,latitude,longitude\n,19.0,72.0\nReal Hospital,19.1,72.1\n"
    results = parse_csv(csv_content)
    assert len(results) == 1
    assert results[0].name == "Real Hospital"


# ---------------------------------------------------------------------------
# Ingest API endpoint tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ingest_requires_admin(staff_user):
    csv_data = b"name,latitude,longitude\nTest,19.0,72.0\n"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/ingest",
            files={"file": ("test.csv", csv_data, "text/csv")},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_ingest_csv_preview_no_db_write(admin_user, db):
    from app.models.hospital import Hospital
    from sqlalchemy import select

    csv_data = b"name,latitude,longitude,beds_total,beds_occupied,icu_available,ventilators_available,surge_status,occupancy_rate,specialties\nPreview Hospital,19.076,72.877,100,50,True,True,normal,50.0,Cardiology\n"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/ingest",
            files={"file": ("hospitals.csv", csv_data, "text/csv")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["total_parsed"] == 1
    assert body["total_inserted"] == 0  # preview only
    assert len(body["preview"]) == 1
    assert body["preview"][0]["name"] == "Preview Hospital"
    assert "Preview only" in body["message"]

    # Verify nothing was written to DB
    count = db.scalar(select(Hospital).where(Hospital.name == "Preview Hospital"))
    assert count is None


@pytest.mark.asyncio
async def test_ingest_csv_confirm_writes_to_db(admin_user, db):
    from app.models.hospital import Hospital
    from sqlalchemy import select

    csv_data = b"name,latitude,longitude,beds_total,beds_occupied,icu_available,ventilators_available,surge_status,occupancy_rate,specialties\nConfirm Hospital,19.076,72.877,100,50,True,True,normal,50.0,Cardiology\n"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/ingest?confirm=true",
            files={"file": ("hospitals.csv", csv_data, "text/csv")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["total_inserted"] == 1
    assert "Successfully inserted" in body["message"]

    # Verify DB write
    db.expire_all()
    hospital = db.scalar(select(Hospital).where(Hospital.name == "Confirm Hospital"))
    assert hospital is not None
    assert hospital.lat == 19.076


@pytest.mark.asyncio
async def test_ingest_json_confirm(admin_user, db):
    from app.models.hospital import Hospital
    from sqlalchemy import select

    data = [{"name": "JSON Ingest Hospital", "lat": 28.6, "lng": 77.2,
             "address": "Delhi", "specialties": "neurology",
             "icu_total": 5, "icu_available": 2, "general_total": 30,
             "general_available": 15, "ventilators_available": 2,
             "status": "normal", "is_24x7": True}]
    json_data = json.dumps(data).encode()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/ingest?confirm=true",
            files={"file": ("hospitals.json", json_data, "application/json")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["total_inserted"] == 1

    db.expire_all()
    hospital = db.scalar(select(Hospital).where(Hospital.name == "JSON Ingest Hospital"))
    assert hospital is not None


@pytest.mark.asyncio
async def test_ingest_idempotent(admin_user, db):
    """Uploading same file twice should skip on second run."""
    csv_data = b"name,latitude,longitude,beds_total,beds_occupied,icu_available,ventilators_available,surge_status,occupancy_rate,specialties\nIdempotent Hospital,19.076,72.877,100,50,True,True,normal,50.0,Cardiology\n"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r1 = await c.post(
            "/api/v1/admin/ingest?confirm=true",
            files={"file": ("h.csv", csv_data, "text/csv")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
        r2 = await c.post(
            "/api/v1/admin/ingest?confirm=true",
            files={"file": ("h.csv", csv_data, "text/csv")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert r1.json()["total_inserted"] == 1
    assert r2.json()["total_inserted"] == 0
    assert r2.json()["total_skipped"] == 1


@pytest.mark.asyncio
async def test_ingest_empty_file_returns_400(admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/ingest",
            files={"file": ("empty.csv", b"", "text/csv")},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 400

