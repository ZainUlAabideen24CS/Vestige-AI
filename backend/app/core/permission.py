from sqlalchemy.orm import Session

from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.project_member import ProjectMember


# ============================================================
# ACCOUNT MANAGER PROJECTS
# ============================================================

def _account_manager_project_ids(
    db: Session,
    user: User,
) -> set[int]:
    """
    Get all project IDs belonging to clients managed
    by this Account Manager.
    """

    client_ids = [
        row[0]
        for row in (
            db.query(Client.id)
            .filter(Client.account_manager_id == user.id)
            .all()
        )
    ]

    if not client_ids:
        return set()

    return {
        row[0]
        for row in (
            db.query(Project.id)
            .filter(Project.client_id.in_(client_ids))
            .all()
        )
    }


# ============================================================
# PROJECT ACCESS
# ============================================================

def accessible_project_ids(
    db: Session,
    user: User,
) -> list[int] | None:
    """
    Return projects accessible to the user.

    Admin:
        All projects

    Account Manager:
        Projects belonging to their clients

    Project Manager:
        Projects they manage

    Project Member:
        Projects where they are active members
    """

    # Admin can access everything
    if user.role == "admin":
        return None

    project_ids: set[int] = set()

    # --------------------------------------------------------
    # Project Manager
    # --------------------------------------------------------

    project_ids.update(
        row[0]
        for row in (
            db.query(Project.id)
            .filter(Project.manager_id == user.id)
            .all()
        )
    )

    # --------------------------------------------------------
    # Project Member
    # --------------------------------------------------------

    project_ids.update(
        row[0]
        for row in (
            db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user.id)
            .filter(ProjectMember.removed_at.is_(None))
            .all()
        )
    )

    # --------------------------------------------------------
    # Account Manager
    # --------------------------------------------------------

    project_ids.update(
        _account_manager_project_ids(
            db,
            user,
        )
    )

    return list(project_ids)


def can_access_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Check whether a user can view/access a project.
    """

    # Admin
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    # --------------------------------------------------------
    # Project Manager
    # --------------------------------------------------------

    if project.manager_id == user.id:
        return True

    # --------------------------------------------------------
    # Account Manager
    # --------------------------------------------------------

    if project.client_id:

        client = db.get(
            Client,
            project.client_id,
        )

        if (
            client
            and client.account_manager_id == user.id
        ):
            return True

    # --------------------------------------------------------
    # Project Member
    # --------------------------------------------------------

    is_member = (
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
    )

    return is_member is not None


# ============================================================
# PROJECT EDIT
# ============================================================

def can_edit_project(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Admin and the assigned Project Manager
    can edit a project.
    """

    # Admin
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    # Assigned Project Manager
    return project.manager_id == user.id


# ============================================================
# PROJECT MEMBER MANAGEMENT
# ============================================================

def can_manage_project_members(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Admin and the assigned Project Manager can manage
    members of a project.
    """

    # Admin
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    # Assigned Project Manager
    return project.manager_id == user.id


# ============================================================
# PAYMENT PERMISSIONS
# ============================================================

def can_view_payment(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Payment visibility:

    Admin:
        Yes

    Account Manager:
        Yes, but only for projects belonging to their clients

    Project Manager:
        No

    Employee:
        No
    """

    # Admin
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    if not project.client_id:
        return False

    client = db.get(
        Client,
        project.client_id,
    )

    if not client:
        return False

    # Account Manager
    return client.account_manager_id == user.id


def can_manage_payment(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Payment create/edit:

    Admin + Account Manager
    """

    return can_view_payment(
        db,
        user,
        project_id,
    )


def can_delete_payment(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Payment deletion:
    Admin only.
    """

    return user.role == "admin"


# ============================================================
# DELIVERY PERMISSIONS
# ============================================================

def can_view_delivery(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Delivery visibility follows normal project access.

    Admin:
        Yes

    Account Manager:
        Yes

    Project Manager:
        Yes

    Project Member / Employee:
        Yes, if active member
    """

    return can_access_project(
        db,
        user,
        project_id,
    )


def can_manage_delivery(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Delivery create/edit:

    Admin:
        Yes

    Project Manager:
        Yes, for their own projects

    Account Manager:
        No

    Employee:
        No
    """

    # Admin
    if user.role == "admin":
        return True

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        return False

    # Assigned Project Manager
    return project.manager_id == user.id


def can_delete_delivery(
    db: Session,
    user: User,
    project_id: int,
) -> bool:
    """
    Delivery deletion:
    Admin only.
    """

    return user.role == "admin"