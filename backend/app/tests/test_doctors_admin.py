"""Tests for doctor CRUD, room assignments, admin governance, and RAG."""

from __future__ import annotations

import pytest
from app.core.config import settings as _settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.doctor import Doctor, DoctorRoomAssignment
from app.models.hospital import Hospital, HospitalStatus
from app.models.specialty import HospitalSpecialty
from app.models.user import User, UserRole
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

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
        db.execute(
            text(
                "TRUNCATE TABLE doctor_room_assignments, doctors, availability_logs, "
                "hospital_specialties, users, hospitals RESTART IDENTITY CASCADE"
            )
        )
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
        name="Test Hospital",
        address="Mumbai, Maharashtra, India",
        lat=19.076,
        lng=72.877,
        icu_total=10,
        icu_available=5,
        general_total=50,
        general_available=20,
        ventilators_available=3,
        status=HospitalStatus.normal,
    )
    db.add(h)
    db.flush()
    db.add(HospitalSpecialty(hospital_id=h.id, name="cardiology"))
    db.commit()
    db.refresh(h)
    return h


@pytest.fixture()
def admin_user(db):
    u = User(email="admin@sys.com", password_hash=hash_password("pass"), role=UserRole.admin)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture()
def staff_user(db, hospital):
    u = User(
        email="staff@h.com",
        password_hash=hash_password("pass"),
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
# Doctor CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_doctor(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{hospital.id}/doctors",
            json={"name": "Dr. Smith", "specialty": "cardiology"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Dr. Smith"
    assert body["specialty"] == "cardiology"
    assert body["room"] is None  # no room assigned yet


@pytest.mark.asyncio
async def test_list_doctors(hospital, admin_user, db):
    doctor = Doctor(
        hospital_id=hospital.id, name="Dr. Jones", specialty="cardiology", is_active=True
    )
    db.add(doctor)
    db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/doctors")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Dr. Jones"


@pytest.mark.asyncio
async def test_update_doctor(hospital, admin_user, db):
    doctor = Doctor(hospital_id=hospital.id, name="Dr. Old", specialty="cardiology", is_active=True)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/hospitals/{hospital.id}/doctors/{doctor.id}",
            json={"name": "Dr. New"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["name"] == "Dr. New"


@pytest.mark.asyncio
async def test_delete_doctor_soft(hospital, admin_user, db):
    doctor = Doctor(
        hospital_id=hospital.id, name="Dr. Gone", specialty="cardiology", is_active=True
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/hospitals/{hospital.id}/doctors/{doctor.id}",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 204

    # Should not appear in active list
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/doctors")
    assert len(res.json()) == 0


@pytest.mark.asyncio
async def test_create_doctor_requires_auth(hospital):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{hospital.id}/doctors",
            json={"name": "Dr. X", "specialty": "cardiology"},
        )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_staff_cannot_add_doctor_to_other_hospital(staff_user, db):
    other = Hospital(
        name="Other",
        address="Pune",
        lat=18.5,
        lng=73.8,
        icu_total=5,
        icu_available=2,
        general_total=20,
        general_available=10,
        ventilators_available=1,
        status=HospitalStatus.normal,
    )
    db.add(other)
    db.commit()
    db.refresh(other)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{other.id}/doctors",
            json={"name": "Dr. X", "specialty": "cardiology"},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Room assignment  anti-hallucination contract
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_assign_room_to_doctor(hospital, admin_user, db):
    doctor = Doctor(
        hospital_id=hospital.id, name="Dr. Room", specialty="cardiology", is_active=True
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            f"/api/v1/hospitals/{hospital.id}/doctors/{doctor.id}/room",
            json={"room_code": "Cardio-101", "room_type": "consultation"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 201
    assert res.json()["room_code"] == "Cardio-101"
    assert res.json()["is_active"] is True


@pytest.mark.asyncio
async def test_doctor_room_shown_in_list(hospital, admin_user, db):
    doctor = Doctor(
        hospital_id=hospital.id, name="Dr. WithRoom", specialty="cardiology", is_active=True
    )
    db.add(doctor)
    db.flush()
    ra = DoctorRoomAssignment(
        doctor_id=doctor.id,
        hospital_id=hospital.id,
        room_code="304",
        room_type="consultation",
        is_active=True,
    )
    db.add(ra)
    db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/doctors")
    assert res.status_code == 200
    doc = res.json()[0]
    assert doc["room"] is not None
    assert doc["room"]["room_code"] == "304"


@pytest.mark.asyncio
async def test_doctor_without_room_returns_null(hospital, admin_user, db):
    doctor = Doctor(
        hospital_id=hospital.id, name="Dr. NoRoom", specialty="cardiology", is_active=True
    )
    db.add(doctor)
    db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/doctors")
    assert res.status_code == 200
    assert res.json()[0]["room"] is None  # anti-hallucination: null, not invented


@pytest.mark.asyncio
async def test_remove_room_assignment(hospital, admin_user, db):
    doctor = Doctor(hospital_id=hospital.id, name="Dr. Rm", specialty="cardiology", is_active=True)
    db.add(doctor)
    db.flush()
    ra = DoctorRoomAssignment(
        doctor_id=doctor.id, hospital_id=hospital.id, room_code="101", is_active=True
    )
    db.add(ra)
    db.commit()
    db.refresh(doctor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/hospitals/{hospital.id}/doctors/{doctor.id}/room",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 204

    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(f"/api/v1/hospitals/{hospital.id}/doctors")
    assert res.json()[0]["room"] is None


# ---------------------------------------------------------------------------
# Admin governance endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_global_audit_requires_admin(staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(
            "/api/v1/admin/audit",
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_global_audit_returns_list(admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(
            "/api/v1/admin/audit",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_metrics_endpoint(admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(
            "/api/v1/admin/metrics",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert "hospitals" in body
    assert "users" in body
    assert "audit_logs" in body
    assert "vector_index" in body


@pytest.mark.asyncio
async def test_metrics_requires_admin(staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get(
            "/api/v1/admin/metrics",
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Emergency keyword safety pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_triage_emergency_keyword_prepend():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/patient/triage",
            json={"symptoms_text": "chest pain and difficulty breathing"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["urgency"] == "emergency"
    assert "EMERGENCY" in body["rationale"] or "emergency" in body["rationale"].lower()
