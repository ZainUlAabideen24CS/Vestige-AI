from sqlalchemy.orm import Session

from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.project_member import ProjectMember


def _account_manager_project_ids(db: Session, user: User) -> set[int]:
    """Projects belonging to clients where this user is the account manager."""
    owned_clients = [
        row[0]
        for row in db.query(Client.id)
        .filter(Client.account_manager_id == user.id)
        .all()
    ]

    if not owned_clients:
        return set()

    return {
        row[0]
        for row in db.query(Project.id)
        .filter(Project.client_id.in_(owned_clients))
        .all()
    }


def accessible_project_ids(db: Session, user: User) -> list[int] | None:
    """
    Admin      — every project.
    Manager    — projects they manage, are a member of, or whose client they own.
    Employee   — projects they are an active member of, or whose client they own.

    A removed member is not active.
    """

    if user.role == "admin":
        return None

    project_ids: set[int] = set()

    # Projects where this user is the assigned project manager
    project_ids.update(
        row[0]
        for row in db.query(Project.id).filter(Project.manager_id == user.id).all()
    )

    # Projects where this user is an active member
    project_ids.update(
        row[0]
        for row in db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.removed_at.is_(None))
        .all()
    )

    # Projects belonging to clients this user is the account manager for
    project_ids.update(_account_manager_project_ids(db, user))

    return list(project_ids)


def can_access_project(db: Session, user: User, project_id: int) -> bool:
    if user.role == "admin":
        return True

    project = db.get(Project, project_id)
    if not project:
        return False

    if project.manager_id == user.id:
        return True

    if project.client_id:
        client = db.get(Client, project.client_id)
        if client and client.account_manager_id == user.id:
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
    """Only admin or the assigned project manager can edit project details."""
    if user.role == "admin":
        return True

    project = db.get(Project, project_id)
    return project is not None and project.manager_id == user.id


def can_manage_project_members(db: Session, user: User, project_id: int) -> bool:
    """Only admin or the assigned project manager can add or remove members."""
    if user.role == "admin":
        return True

    project = db.get(Project, project_id)
    return project is not None and project.manager_id == user.id