from __future__ import annotations

"""
Admin user management endpoints.

GET    /admin/users              — list all users
GET    /admin/users/{id}         — get one user
PATCH  /admin/users/{id}         — update role or hospital assignment
DELETE /admin/users/{id}         — delete user
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_role
from app.db.session import get_db
from app.models.hospital import Hospital
from app.models.user import User, UserRole
from app.schemas.auth import UserOut, UserUpdate

router = APIRouter()


@router.get(
    "/users",
    response_model=list[UserOut],
    summary="List all users (admin)",
    description="Returns all registered users. Filterable by role. Requires `admin` role.",
)
def list_users(
    role: str | None = Query(None, description="Filter by role: admin | hospital_staff"),
    hospital_id: int | None = Query(None, description="Filter by hospital"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> list[UserOut]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if hospital_id is not None:
        stmt = stmt.where(User.hospital_id == hospital_id)
    stmt = stmt.offset(offset).limit(limit)
    users = db.scalars(stmt).all()
    return [UserOut(id=u.id, email=u.email, role=u.role.value, hospital_id=u.hospital_id) for u in users]


@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Get user by ID (admin)",
    description="Returns a single user's profile. Requires `admin` role.",
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> UserOut:
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=target.id, email=target.email, role=target.role.value, hospital_id=target.hospital_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Update user role or hospital (admin)",
    description="""
Update a user's role or hospital assignment.

Use cases:
- Promote a `hospital_staff` to `admin`
- Reassign a staff member to a different hospital
- Remove hospital association (set hospital_id to null)

Requires `admin` role.
    """,
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> UserOut:
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role is not None:
        allowed_roles = {"admin", "hospital_staff"}
        if payload.role not in allowed_roles:
            raise HTTPException(status_code=422, detail=f"role must be one of {allowed_roles}")
        target.role = UserRole(payload.role)

    if payload.hospital_id is not None:
        hospital = db.get(Hospital, payload.hospital_id)
        if not hospital:
            raise HTTPException(status_code=400, detail="Invalid hospital_id")
        target.hospital_id = payload.hospital_id
    elif "hospital_id" in payload.model_fields_set:
        # Explicitly set to null
        target.hospital_id = None

    db.commit()
    db.refresh(target)
    return UserOut(id=target.id, email=target.email, role=target.role.value, hospital_id=target.hospital_id)


@router.delete(
    "/users/{user_id}",
    status_code=204,
    summary="Delete a user (admin)",
    description="Permanently deletes a user account. Requires `admin` role. Cannot delete yourself.",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.admin)),
) -> None:
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(target)
    db.commit()
