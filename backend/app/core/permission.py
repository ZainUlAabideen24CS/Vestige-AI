from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember


def accessible_project_ids(
    db: Session,
    user: User,
) -> list[int] | None:
    """
    Return the project IDs the user is allowed to access.

    Rules:
        - admin:
            Can access ALL projects.

        - manager:
            Can access:
                1. Projects where they are the actual project manager.
                2. Projects where they have an active project membership.

        - employee:
            Can access only projects where they have
            an active project membership.

    None means unrestricted access.
    """

    # Admin has unrestricted access.
    if user.role == "admin":
        return None

    project_ids: set[int] = set()

    # ---------------------------------------------------------
    # Projects where the user is the actual project manager
    # ---------------------------------------------------------

    managed_projects = (
        db.query(Project.id)
        .filter(Project.manager_id == user.id)
        .all()
    )

    project_ids.update(
        row[0] for row in managed_projects
    )

    # ---------------------------------------------------------
    # Active project memberships
    # ---------------------------------------------------------

    memberships = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.removed_at.is_(None))
        .all()
    )

    project_ids.update(
        row[0] for row in memberships
    )

    return list(project_ids)


def can_access_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Check whether a user can view/access a specific project.

    Rules:
        - admin -> every project
        - project manager -> their project
        - active project member -> their project
        - everyone else -> denied
    """

    # Admin can access everything.
    if user.role == "admin":
        return True

    project = db.get(Project, project_id)

    if not project:
        return False

    # Actual manager of this project can access it,
    # regardless of their global role.
    if project.manager_id == user.id:
        return True

    # Active project member can access it.
    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .filter(ProjectMember.user_id == user.id)
        .filter(ProjectMember.removed_at.is_(None))
        .first()
    )

    return membership is not None


def can_edit_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Check whether the user can edit a specific project.

    Rules:
        - admin -> can edit any project
        - actual project manager -> can edit their project
        - other managers -> cannot edit
        - employees -> cannot edit
    """

    if user.role == "admin":
        return True

    project = db.get(Project, project_id)

    if not project:
        return False

    # Only the actual manager of this project
    # can edit it.
    return project.manager_id == user.id


def can_manage_project_members(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Check whether the user can ADD or REMOVE employees
    from a specific project.

    Rules:
        - admin -> any project
        - actual project manager -> their project only
        - everyone else -> denied
    """

    # Admin can manage members of every project.
    if user.role == "admin":
        return True

    project = db.get(Project, project_id)

    if not project:
        return False

    # Only the actual manager assigned to THIS project
    # can manage its members.
    return project.manager_id == user.id