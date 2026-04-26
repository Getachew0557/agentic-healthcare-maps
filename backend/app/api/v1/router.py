from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    admin, auth, contact, doctors, health,
    hospital_admin, hospitals, ingest, patient, users, ws,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(contact.router, tags=["contact"])
api_router.include_router(patient.router, prefix="/patient", tags=["patient"])
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["hospitals"])
api_router.include_router(doctors.router, prefix="/hospitals", tags=["doctors"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(hospital_admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(users.router, prefix="/admin", tags=["admin"])
api_router.include_router(ingest.router, prefix="/admin", tags=["ingest"])
api_router.include_router(ws.router, tags=["realtime"])
