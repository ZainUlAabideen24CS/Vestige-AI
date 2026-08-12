from sqlalchemy.orm import Session
from app.models.user import User
from app.models.project_member import ProjectMember


def accessible_project_ids(db: Session, user: User) -> list[int] | None:
    """None means no restriction. Otherwise the project IDs this user can access."""
    if user.role in ("admin", "manager"):
        return None

    rows = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.removed_at.is_(None))
        .all()
    )
    return [r[0] for r in rows]


def can_access_project(db: Session, user: User, project_id: int) -> bool:
    if user.role == "admin":
        return True
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.removed_at.is_(None))
        .first()
        is not None
    )


def can_edit_project(db: Session, user: User, project_id: int) -> bool:
    if user.role == "admin":
        return True
    if user.role != "manager":
        return False
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.role_on_project == "manager")
        .filter(ProjectMember.removed_at.is_(None))
        .first()
        is not None
    )