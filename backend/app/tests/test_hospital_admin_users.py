"""Tests for admin hospital CRUD, user management, and contact form."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.hospital import Hospital, HospitalStatus
from app.models.user import User, UserRole
from app.core.security import create_access_token, hash_password

TEST_DB_URL = "postgresql+psycopg2://postgres:root@localhost:5432/ahm_test"
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
            "TRUNCATE TABLE agent_traces, chat_messages, chat_sessions, "
            "doctor_room_assignments, doctors, availability_logs, "
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
def hospital(db):
    h = Hospital(name="Test Hospital", address="Mumbai, India",
                 lat=19.076, lng=72.877, icu_total=10, icu_available=5,
                 general_total=50, general_available=20, ventilators_available=3,
                 status=HospitalStatus.normal)
    db.add(h)
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
    u = User(email="staff@h.com", password_hash=hash_password("pass"),
             role=UserRole.hospital_staff, hospital_id=hospital.id)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _tok(user):
    return create_access_token(subject=str(user.id))


# ---------------------------------------------------------------------------
# Admin Hospital CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_list_hospitals(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/hospitals",
                          headers={"Authorization": f"Bearer {_tok(admin_user)}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1


@pytest.mark.asyncio
async def test_admin_list_hospitals_requires_admin(staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/hospitals",
                          headers={"Authorization": f"Bearer {_tok(staff_user)}"})
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_create_hospital(admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/hospitals",
            json={"name": "New Hospital", "address": "Delhi, India",
                  "lat": 28.6, "lng": 77.2, "icu_total": 10, "icu_available": 5,
                  "general_total": 50, "general_available": 20,
                  "ventilators_available": 3, "specialties": ["cardiology", "emergency"]},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "New Hospital"
    assert "cardiology" in body["specialties"]


@pytest.mark.asyncio
async def test_admin_create_hospital_duplicate_rejected(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/admin/hospitals",
            json={"name": "Test Hospital", "lat": 19.0, "lng": 72.0},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_admin_update_hospital(hospital, admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/hospitals/{hospital.id}",
            json={"name": "Updated Hospital", "is_24x7": False},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Hospital"
    assert res.json()["is_24x7"] is False


@pytest.mark.asyncio
async def test_admin_delete_hospital(hospital, admin_user, db):
    hospital_id = hospital.id  # capture before delete
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/admin/hospitals/{hospital_id}",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 204
    # Use a fresh query — db.get() raises ObjectDeletedError on deleted rows
    from sqlalchemy import select as sa_select
    db.expire_all()
    result = db.scalar(sa_select(Hospital).where(Hospital.id == hospital_id))
    assert result is None


# ---------------------------------------------------------------------------
# Hospital staff self-service
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_staff_get_own_hospital(hospital, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/hospitals/me",
                          headers={"Authorization": f"Bearer {_tok(staff_user)}"})
    assert res.status_code == 200
    assert res.json()["id"] == hospital.id


@pytest.mark.asyncio
async def test_staff_update_own_hospital(hospital, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            "/api/v1/admin/hospitals/me",
            json={"phone": "+91-22-12345678", "is_24x7": True},
            headers={"Authorization": f"Bearer {_tok(staff_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["phone"] == "+91-22-12345678"


# ---------------------------------------------------------------------------
# Admin User Management
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_list_users(admin_user, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/users",
                          headers={"Authorization": f"Bearer {_tok(admin_user)}"})
    assert res.status_code == 200
    assert len(res.json()) >= 2


@pytest.mark.asyncio
async def test_admin_list_users_filter_by_role(admin_user, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/users?role=hospital_staff",
                          headers={"Authorization": f"Bearer {_tok(admin_user)}"})
    assert res.status_code == 200
    assert all(u["role"] == "hospital_staff" for u in res.json())


@pytest.mark.asyncio
async def test_admin_update_user_role(admin_user, staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.patch(
            f"/api/v1/admin/users/{staff_user.id}",
            json={"role": "admin"},
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_admin_delete_user(admin_user, staff_user, db):
    user_id = staff_user.id  # capture before delete
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 204
    from sqlalchemy import select as sa_select
    db.expire_all()
    result = db.scalar(sa_select(User).where(User.id == user_id))
    assert result is None


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(admin_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.delete(
            f"/api/v1/admin/users/{admin_user.id}",
            headers={"Authorization": f"Bearer {_tok(admin_user)}"},
        )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_user_management_requires_admin(staff_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.get("/api/v1/admin/users",
                          headers={"Authorization": f"Bearer {_tok(staff_user)}"})
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Contact form
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_contact_form_no_auth_required():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/contact",
            json={"name": "Dr. Test", "email": "test@hospital.com",
                  "subject": "Join platform", "message": "We want to register our hospital."},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "received"
    assert "24 hours" in body["message"]


@pytest.mark.asyncio
async def test_contact_form_invalid_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        res = await c.post(
            "/api/v1/contact",
            json={"name": "Test", "email": "not-an-email",
                  "subject": "Test", "message": "Hello"},
        )
    assert res.status_code == 422


