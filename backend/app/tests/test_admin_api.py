"""Tests for admin availability update endpoint  runs against Postgres."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.availability_log import AvailabilityLog
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
from app.models.user import User, UserRole
from app.core.security import create_access_token, hash_password

# ---------------------------------------------------------------------------
# Test DB  dedicated Postgres test database
# ---------------------------------------------------------------------------

from app.core.config import settings as _settings
TEST_DB_URL = _settings.test_database_url

# Create test DB if it does not exist (run once at import time)
def _ensure_test_db() -> None:
    import psycopg2
    conn = psycopg2.connect(host="localhost", user="postgres", password="root", dbname="postgres")
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname='ahm_test'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE ahm_test")
    conn.close()

_ensure_test_db()

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
    """Truncate all tables before each test for isolation."""
    db = _TestSession()
    try:
        # Disable FK checks, truncate all, re-enable
        db.execute(text("TRUNCATE TABLE availability_logs, hospital_specialties, users, hospitals RESTART IDENTITY CASCADE"))
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
def hospital(db):
    h = Hospital(
        name="Test Hospital", address="Mumbai",
        lat=19.076, lng=72.877,
        icu_total=10, icu_available=5,
        general_total=50, general_available=20,
        ventilators_available=3, status=HospitalStatus.normal,
    )
    db.add(h)
    db.flush()
    db.add(HospitalSpecialty(hospital_id=h.id, name="cardiology"))
    db.commit()
    db.refresh(h)
    return h


@pytest.fixture()
def other_hospital(db):
    h = Hospital(
        name="Other Hospital", address="Pune",
        lat=18.520, lng=73.856,
        icu_total=8, icu_available=4,
        general_total=40, general_available=15,
        ventilators_available=2, status=HospitalStatus.normal,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@pytest.fixture()
def staff_user(db, hospital):
    u = User(
        email="staff@hospital.com",
        password_hash=hash_password("pass123"),
        role=UserRole.hospital_staff,
        hospital_id=hospital.id,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture()
def admin_user(db):
    u = User(
        email="admin@system.com",
        password_hash=hash_password("pass123"),
        role=UserRole.admin,
        hospital_id=None,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _tok(user):
    return create_access_token(subject=str(user.id))


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_requires_auth(hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={"icu_available": 3},
        )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_staff_updates_own_hospital(hospital, staff_user, db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={"icu_available": 3, "status": "busy"},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["icu_available"] == 3
    assert body["status"] == "busy"
    db.expire_all()
    logs = db.scalars(
        select(AvailabilityLog).where(AvailabilityLog.hospital_id == hospital.id)
    ).all()
    fields = {lg.field_name for lg in logs}
    assert "icu_available" in fields
    assert "status" in fields


@pytest.mark.asyncio
async def test_staff_blocked_from_other_hospital(staff_user, other_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{other_hospital.id}/availability",
            json={"icu_available": 1},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_updates_any_hospital(admin_user, other_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{other_hospital.id}/availability",
            json={"general_available": 10},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["general_available"] == 10


@pytest.mark.asyncio
async def test_available_exceeds_total_rejected(hospital, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={"icu_available": 999},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_negative_rejected(hospital, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={"icu_available": -1},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_empty_payload_rejected(hospital, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_availability_logs_returned(hospital, staff_user, db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}/availability",
            json={"icu_available": 2},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
        res = await c.get(
            f"/api/v1/admin/hospitals/{hospital.id}/availability-logs",
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    assert logs[0]["field_name"] == "icu_available"

