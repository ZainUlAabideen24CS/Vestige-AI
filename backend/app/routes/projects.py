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
# DROPDOWN FOR SEARCH (NEW - Cascading Support)
# ============================================================

@router.get("/dropdown")
def list_projects_for_dropdown(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Returns only projects for a specific client that the user can access."""
    allowed_ids = accessible_project_ids(db, user)
    
    query = db.query(Project.id, Project.name).filter(Project.client_id == client_id)
    
    # Security: Sirf wahi projects dikhayen jin ki ijazat hai
    if allowed_ids is not None:
        if not allowed_ids:
            return []
        query = query.filter(Project.id.in_(allowed_ids))
        
    projects = query.all()
    return [{"id": p.id, "name": p.name} for p in projects]


# ============================================================
# RESPONSE HELPER
# ============================================================

def project_response(project: Project, user: User):
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
    if q:
        query = query.filter(Project.name.ilike(f"%{q}%"))
    if status:
        query = query.filter(Project.status == status)
    if client_id:
        query = query.filter(Project.client_id == client_id)

    allowed = accessible_project_ids(db, user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(Project.id.in_(allowed))

    projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    return [project_response(p, user) for p in projects]


# ============================================================
# GET SINGLE PROJECT, CREATE, UPDATE, DELETE (Kept Original Logic)
# ============================================================

@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project or not can_access_project(db, user, project_id):
        raise HTTPException(status_code=404 if not project else 403, detail="Not found or permitted")
    return project_response(project, user)

@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("admin", "manager"))):
    if not db.get(Client, payload.client_id):
        raise HTTPException(status_code=400, detail="Client not found")
    data = payload.model_dump()
    if user.role == "manager" and data.get("manager_id") is None:
        data["manager_id"] = user.id
    project = Project(**data)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project or not can_edit_project(db, user, project_id):
        raise HTTPException(status_code=404 if not project else 403, detail="Not found or permitted")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(status_code=404, detail="Not found")
    db.delete(project)
    db.commit()
    return None