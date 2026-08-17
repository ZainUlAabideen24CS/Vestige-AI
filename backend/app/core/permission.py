from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember


def accessible_project_ids(
    db: Session,
    user: User,
) -> list[int] | None:
    """
    Return project IDs accessible by the current user.

    Admin:
        Access to every project.

    Manager:
        Access to:
        1. Projects where they are the actual manager.
        2. Projects where they are an active member.

    Employee:
        Access only to projects where they are
        an active member.

    A removed member is NOT considered active.
    """

    # ========================================================
    # ADMIN
    # ========================================================

    if user.role == "admin":
        return None

    # ========================================================
    # MANAGER
    # ========================================================

    if user.role == "manager":

        # Projects where this user is the actual manager.
        managed_project_ids = (
            db.query(Project.id)
            .filter(
                Project.manager_id == user.id
            )
            .all()
        )

        # Projects where this manager is also an active member.
        member_project_ids = (
            db.query(ProjectMember.project_id)
            .filter(
                ProjectMember.user_id == user.id
            )
            .filter(
                ProjectMember.removed_at.is_(None)
            )
            .all()
        )

        project_ids = {
            row[0]
            for row in managed_project_ids
        }

        project_ids.update(
            row[0]
            for row in member_project_ids
        )

        return list(project_ids)

    # ========================================================
    # EMPLOYEE
    # ========================================================

    rows = (
        db.query(ProjectMember.project_id)
        .filter(
            ProjectMember.user_id == user.id
        )
        .filter(
            ProjectMember.removed_at.is_(None)
        )
        .all()
    )

    return [
        row[0]
        for row in rows
    ]


def can_access_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Check whether a user can access a specific project.
    """

    # Admin can access everything.
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    # Actual project manager always has access.
    if project.manager_id == user.id:
        return True

    # Active project member has access.
    return (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id
        )
        .filter(
            ProjectMember.user_id == user.id
        )
        .filter(
            ProjectMember.removed_at.is_(None)
        )
        .first()
        is not None
    )


def can_edit_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Only admin or the actual project manager
    can edit project information.
    """

    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    return project.manager_id == user.id


def can_manage_project_members(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Only:
        - admin
        - actual manager of this project

    can add/remove project members.
    """

    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    return project.manager_id == user.id