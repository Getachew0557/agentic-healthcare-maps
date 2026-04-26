"""Tests for hospital CRUD, specialty endpoints, geo filter, and health check."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
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
            "TRUNCATE TABLE availability_logs, hospital_specialties, users, hospitals RESTART IDENTITY CASCADE"
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
def hospital(db):
    h = Hospital(
        name="Mumbai General", address="Bandra, Mumbai",
        lat=19.076, lng=72.877,
        icu_total=10, icu_available=5,
        general_total=50, general_available=20,
        ventilators_available=3, status=HospitalStatus.normal,
    )
    db.add(h)
    db.flush()
    db.add(HospitalSpecialty(hospital_id=h.id, name="cardiology"))
    db.add(HospitalSpecialty(hospital_id=h.id, name="emergency"))
    db.commit()
    db.refresh(h)
    return h


@pytest.fixture()
def far_hospital(db):
    # Pune  ~150 km from Mumbai
    h = Hospital(
        name="Pune Hospital", address="Pune",
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


def _tok(user):
    return create_access_token(subject=str(user.id))


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert "status" in body
    assert "database" in body
    assert "redis" in body
    assert body["database"] == "ok"


# ---------------------------------------------------------------------------
# Hospital list  basic
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_hospitals_returns_all(hospital, far_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals")
    assert res.status_code == 200
    assert len(res.json()) == 2


@pytest.mark.asyncio
async def test_list_hospitals_filter_specialty(hospital, far_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals?specialty=cardiology")
    assert res.status_code == 200
    names = [h["name"] for h in res.json()]
    assert "Mumbai General" in names
    assert "Pune Hospital" not in names


@pytest.mark.asyncio
async def test_list_hospitals_filter_status(hospital, far_hospital, db):
    # Mark far_hospital as busy
    far_hospital.status = HospitalStatus.busy
    db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals?status=busy")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Pune Hospital"


# ---------------------------------------------------------------------------
# Hospital list  geo filter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_geo_filter_includes_nearby(hospital, far_hospital):
    # Patient in Mumbai  50 km radius should include Mumbai General, exclude Pune
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals?lat=19.076&lng=72.877&radius_km=50")
    assert res.status_code == 200
    names = [h["name"] for h in res.json()]
    assert "Mumbai General" in names
    assert "Pune Hospital" not in names


@pytest.mark.asyncio
async def test_geo_filter_wide_radius_includes_both(hospital, far_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals?lat=19.076&lng=72.877&radius_km=200")
    assert res.status_code == 200
    assert len(res.json()) == 2


# ---------------------------------------------------------------------------
# Get single hospital
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_hospital_by_id(hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}")
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Mumbai General"
    assert "cardiology" in body["specialties"]


@pytest.mark.asyncio
async def test_get_hospital_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/hospitals/99999")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Specialty endpoints
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_specialties(hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/specialties")
    assert res.status_code == 200
    names = [s["name"] for s in res.json()]
    assert "cardiology" in names
    assert "emergency" in names


@pytest.mark.asyncio
async def test_add_specialty_as_admin(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{hospital.id}/specialties",
            json={"name": "neurology"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 201
    assert res.json()["name"] == "neurology"


@pytest.mark.asyncio
async def test_add_specialty_idempotent(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        # Add same specialty twice
        r1 = await c.post(
            f"/api/v1/hospitals/{hospital.id}/specialties",
            json={"name": "cardiology"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
        r2 = await c.post(
            f"/api/v1/hospitals/{hospital.id}/specialties",
            json={"name": "cardiology"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.asyncio
async def test_add_specialty_requires_auth(hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{hospital.id}/specialties",
            json={"name": "oncology"},
        )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_staff_cannot_add_specialty_to_other_hospital(staff_user, far_hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{far_hospital.id}/specialties",
            json={"name": "oncology"},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_delete_specialty(hospital, admin_user, db):
    # Get the cardiology specialty id
    from sqlalchemy import select
    from app.models.specialty import HospitalSpecialty
    spec = db.scalar(
        select(HospitalSpecialty).where(
            HospitalSpecialty.hospital_id == hospital.id,
            HospitalSpecialty.name == "cardiology",
        )
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/hospitals/{hospital.id}/specialties/{spec.id}",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 204

    # Verify it's gone
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/specialties")
    names = [s["name"] for s in res.json()]
    assert "cardiology" not in names


@pytest.mark.asyncio
async def test_delete_specialty_not_found(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/hospitals/{hospital.id}/specialties/99999",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 404

