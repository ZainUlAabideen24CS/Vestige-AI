from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.user import User
from app.schemas.user import UserOut

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