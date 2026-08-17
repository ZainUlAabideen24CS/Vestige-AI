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
# RESPONSE HELPER
# ============================================================

def project_response(
    project: Project,
    user: User,
):
    """
    Admin and actual project manager receive
    the full project response.

    Other accessible users receive restricted response.
    """

    if user.role == "admin":
        return ProjectOut.model_validate(project)

    if project.manager_id == user.id:
        return ProjectOut.model_validate(project)

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
            Project.name.ilike(
                f"%{q}%"
            )
        )

    # Status
    if status:
        query = query.filter(
            Project.status == status
        )

    # Client
    if client_id:
        query = query.filter(
            Project.client_id == client_id
        )

    # ========================================================
    # ACCESS CONTROL
    # ========================================================

    allowed = accessible_project_ids(
        db,
        user,
    )

    # None = admin/unrestricted.
    if allowed is not None:

        if not allowed:
            return []

        query = query.filter(
            Project.id.in_(allowed)
        )

    # ========================================================
    # FETCH
    # ========================================================

    projects = (
        query
        .order_by(
            Project.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        project_response(
            project,
            user,
        )
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
    project = db.get(
        Project,
        project_id,
    )

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
            detail="Not permitted",
        )

    return project_response(
        project,
        user,
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
        require_roles(
            "admin",
            "manager",
        )
    ),
):
    # ========================================================
    # CLIENT VALIDATION
    # ========================================================

    if not db.get(
        Client,
        payload.client_id,
    ):
        raise HTTPException(
            status_code=400,
            detail="Client not found",
        )

    # ========================================================
    # MANAGER
    # ========================================================

    data = payload.model_dump()

    manager_id = data.get(
        "manager_id"
    )

    # If a manager creates a project and does not
    # select another manager, make the current user
    # the manager automatically.
    if user.role == "manager" and manager_id is None:
        manager_id = user.id
        data["manager_id"] = user.id

    # Validate selected manager.
    if manager_id is not None:

        manager = db.get(
            User,
            manager_id,
        )

        if not manager:
            raise HTTPException(
                status_code=400,
                detail="Manager not found",
            )

        if manager.role != "manager":
            raise HTTPException(
                status_code=400,
                detail="Selected user is not a manager",
            )

    # ========================================================
    # CREATE
    # ========================================================

    project = Project(
        **data
    )

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

    if not can_edit_project(
        db,
        user,
        project_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Not permitted to edit this project",
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    # ========================================================
    # MANAGER VALIDATION
    # ========================================================

    if (
        "manager_id" in data
        and data["manager_id"] is not None
    ):

        manager = db.get(
            User,
            data["manager_id"],
        )

        if not manager:
            raise HTTPException(
                status_code=400,
                detail="Manager not found",
            )

        if manager.role != "manager":
            raise HTTPException(
                status_code=400,
                detail="Selected user is not a manager",
            )

    # ========================================================
    # APPLY
    # ========================================================

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