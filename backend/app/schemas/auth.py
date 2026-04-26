from __future__ import annotations

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "patient"
    hospital_id: int | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    hospital_id: int | None = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    hospital_id: int | None = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    """Admin creates users (including admin and hospital_staff)."""
    email: EmailStr
    password: str
    role: str = "patient"
    hospital_id: int | None = None


class UserUpdate(BaseModel):
    """Admin can update any user's role, hospital assignment, email, or password."""
    role: str | None = None
    hospital_id: int | None = None
    email: EmailStr | None = None
    password: str | None = None


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class ContactResponse(BaseModel):
    status: str
    message: str

