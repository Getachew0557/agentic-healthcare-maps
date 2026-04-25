from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, RegisterRequest, TokenResponse

router = APIRouter()


@router.post("/register", response_model=MeResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hospital_id = payload.hospital_id
    if hospital_id is not None:
        hospital = db.get(Hospital, hospital_id)
        if not hospital:
            raise HTTPException(status_code=400, detail="Invalid hospital_id")

    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role=payload.role,  # SQLAlchemy Enum accepts str values too
        hospital_id=hospital_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return MeResponse(id=user.id, email=user.email, role=str(user.role.value), hospital_id=user.hospital_id)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=user.id, email=user.email, role=str(user.role.value), hospital_id=user.hospital_id)

