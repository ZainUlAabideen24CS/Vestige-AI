
from fastapi import APIRouter, Depends, HTTPException, Query

from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
    require_roles,
)

from app.core.permission import (
    accessible_project_ids,
    can_access_project,
    can_edit_project,
)

from app.models.project import Project
from app.models.client import Client
from app.models.user import User

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    ProjectOutRestricted,
)


router = APIRouter(
    prefix="/projects",
    tags=["projects"],
)


# ============================================================
# DROPDOWN FOR SEARCH
# ============================================================

@router.get("/dropdown")
def list_projects_for_dropdown(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Returns only projects for a specific client
    that the current user can access.
    """

    allowed_ids = accessible_project_ids(db, user)

    query = (
        db.query(Project.id, Project.name)
        .filter(Project.client_id == client_id)
    )

    # Security:
    # Only return projects the user is allowed to access.
    if allowed_ids is not None:
        if not allowed_ids:
            return []

        query = query.filter(Project.id.in_(allowed_ids))

    projects = query.all()

    return [
        {
            "id": project.id,
            "name": project.name,
        }
        for project in projects
    ]


# ============================================================
# RESPONSE HELPER
# ============================================================

def project_response(project: Project, user: User):
    """
    Controls which project fields are visible to each role.

    Admin:
        Full project information including budget.

    Account Manager:
        Full project information including budget,
        but project editing is handled separately.

    Project Manager:
        Project information WITHOUT budget.

    Employee:
        Restricted project information WITHOUT budget.
    """

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------
    if user.role == "admin":
        return ProjectOut.model_validate(project)

    # --------------------------------------------------------
    # ACCOUNT MANAGER
    # --------------------------------------------------------
    # Account Manager is identified through the client.
    if project.client_id:
        client = None

        # We cannot access DB here directly, so this check is
        # handled in list/get functions where DB is available.
        #
        # This branch is intentionally not used directly.
        pass

    # --------------------------------------------------------
    # PROJECT MANAGER
    # --------------------------------------------------------
    # Project Manager can access their project, but budget
    # should NOT be exposed.
    if project.manager_id == user.id:
        return ProjectOutRestricted.model_validate(project)

    # --------------------------------------------------------
    # EMPLOYEE / OTHER USERS
    # --------------------------------------------------------
    return ProjectOutRestricted.model_validate(project)


# ============================================================
# ACCOUNT-MANAGER-AWARE RESPONSE
# ============================================================

def build_project_response(
    project: Project,
    user: User,
    db: Session,
):
    """
    Determines the correct response based on the user's
    relationship with the project.
    """

    # --------------------------------------------------------
    # ADMIN
    # --------------------------------------------------------
    if user.role == "admin":
        return ProjectOut.model_validate(project)

    # --------------------------------------------------------
    # ACCOUNT MANAGER
    # --------------------------------------------------------
    if project.client_id:
        client = db.get(Client, project.client_id)

        if client and client.account_manager_id == user.id:
            # Account Manager can see budget.
            return ProjectOut.model_validate(project)

    # --------------------------------------------------------
    # PROJECT MANAGER
    # --------------------------------------------------------
    if project.manager_id == user.id:
        # Project Manager should NOT see budget.
        return ProjectOutRestricted.model_validate(project)

    # --------------------------------------------------------
    # EMPLOYEE / OTHER ACCESS
    # --------------------------------------------------------
    return ProjectOutRestricted.model_validate(project)


# ============================================================
# LIST PROJECTS
# ============================================================

@router.get("")
def list_projects(
    q: str | None = Query(None),
    status: str | None = None,
    client_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Project)

    # Search
    if q:
        query = query.filter(
            Project.name.ilike(f"%{q}%")
        )

    # Status filter
    if status:
        query = query.filter(
            Project.status == status
        )

    # Client filter
    if client_id:
        query = query.filter(
            Project.client_id == client_id
        )

    # Security / project access
    allowed = accessible_project_ids(db, user)

    if allowed is not None:
        if not allowed:
            return []

        query = query.filter(
            Project.id.in_(allowed)
        )

    projects = (
        query
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        build_project_response(project, user, db)
        for project in projects
    ]


# ============================================================
# GET SINGLE PROJECT
# ============================================================

@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if not can_access_project(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project",
        )

    return build_project_response(
        project,
        user,
        db,
    )


# ============================================================
# CREATE PROJECT
# ============================================================

@router.post(
    "",
    response_model=ProjectOut,
    status_code=201,
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("admin", "manager")
    ),
):
    # Check client
    client = db.get(
        Client,
        payload.client_id,
    )

    if not client:
        raise HTTPException(
            status_code=400,
            detail="Client not found",
        )

    data = payload.model_dump()

    # If manager creates project without assigning
    # a project manager, assign themselves.
    if (
        user.role == "manager"
        and data.get("manager_id") is None
    ):
        data["manager_id"] = user.id

    project = Project(**data)

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


# ============================================================
# UPDATE PROJECT
# ============================================================

@router.patch(
    "/{project_id}",
    response_model=ProjectOut,
)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    # Only Admin or assigned Project Manager
    # can edit project details.
    if not can_edit_project(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the Admin or assigned Project Manager can edit this project",
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    for field, value in data.items():
        setattr(
            project,
            field,
            value,
        )

    db.commit()
    db.refresh(project)

    return project


# ============================================================
# DELETE PROJECT
# ============================================================

@router.delete(
    "/{project_id}",
    status_code=204,
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(
        require_roles("admin")
    ),
):
    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    db.delete(project)
    db.commit()

    return None

