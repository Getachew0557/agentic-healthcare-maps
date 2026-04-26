from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse

router = APIRouter()


@router.post(
    "/register",
    response_model=MeResponse,
    summary="Register a patient or hospital staff account",
    description="""
Create a new user account.

- `role` must be `patient` or `hospital_staff` (self-service sign-up; no public `admin` registration)
- `hospital_id` optional; if set, must reference an existing hospital
- Returns the created user (no token; call `/login` or use a client that logs in immediately)
    """,
    responses={
        200: {"content": {"application/json": {"example": {"id": 1, "email": "staff@hospital.com", "role": "hospital_staff", "hospital_id": 5}}}},
        409: {"description": "Email already registered"},
        400: {"description": "Invalid hospital_id"},
    },
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid role")
    if role not in (UserRole.patient, UserRole.hospital_staff):
        raise HTTPException(
            status_code=422,
            detail="Only patient or hospital_staff can register via this endpoint",
        )

    hospital_id = payload.hospital_id
    if hospital_id is not None:
        hospital = db.get(Hospital, hospital_id)
        if not hospital:
            raise HTTPException(status_code=400, detail="Invalid hospital_id")

    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role=role,
        hospital_id=hospital_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return MeResponse(id=user.id, email=user.email, role=str(user.role.value), hospital_id=user.hospital_id)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
    description="""
Authenticate with email and password.

Returns a short-lived JWT (`access_token`). Include it in subsequent requests:
```
Authorization: Bearer <access_token>
```
Token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60 minutes).
    """,
    responses={
        200: {"content": {"application/json": {"example": {"access_token": "eyJhbGci...", "token_type": "bearer"}}}},
        401: {"description": "Invalid credentials"},
    },
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        subject=str(user.id),
        email=user.email,
        role=user.role.value,
        hospital_id=user.hospital_id,
    )
    return TokenResponse(access_token=token)


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get current authenticated user",
    description="Returns the profile of the user identified by the Bearer token.",
    responses={
        200: {"content": {"application/json": {"example": {"id": 1, "email": "staff@hospital.com", "role": "hospital_staff", "hospital_id": 5}}}},
        401: {"description": "Missing or invalid token"},
    },
)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=user.id, email=user.email, role=str(user.role.value), hospital_id=user.hospital_id)
