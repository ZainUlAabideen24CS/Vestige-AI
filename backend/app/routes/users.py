from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserOut, AdminCreateUser
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_ROLES = {"admin", "manager", "employee"}


class RoleUpdate(BaseModel):
    role: str


@router.get("", response_model=list[UserOut])
def list_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.full_name).all()


# ============================================================
# ADMIN: CREATE USER (with temporary password)
# ============================================================

@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: AdminCreateUser,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(400, f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")

    if len(payload.temporary_password) < 8:
        raise HTTPException(400, "Temporary password must be at least 8 characters")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.temporary_password),
        role=payload.role,
        must_reset_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_welcome_email(user.email, user.full_name, payload.temporary_password)
    except Exception as e:
        # User is still created even if the email fails to send --
        # the admin can share the temp password manually if needed.
        print(f"[users] Failed to send welcome email: {e}")

    return user


@router.patch("/{user_id}/role", response_model=UserOut)
def update_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin")),
):
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(400, f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")

    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")

    if target.id == admin.id and payload.role != "admin":
        raise HTTPException(400, "You cannot remove your own admin role")

    target.role = payload.role
    db.commit()
    db.refresh(target)
    return target