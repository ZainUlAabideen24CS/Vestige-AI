from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user, require_roles
from app.models.project import Project
from app.models.client import Client
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectOutRestricted

router = APIRouter(prefix="/projects", tags=["projects"])


def project_response(project: Project, user: User):
    if user.role in ("admin", "manager"):
        return ProjectOut.model_validate(project)
    return ProjectOutRestricted.model_validate(project)


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
    projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    return [project_response(p, user) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_response(project, user)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    if not db.get(Client, payload.client_id):
        raise HTTPException(status_code=400, detail="Client not found")
    if payload.manager_id is not None and not db.get(User, payload.manager_id):
        raise HTTPException(status_code=400, detail="Manager not found")

    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "manager")),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("manager_id") is not None and not db.get(User, data["manager_id"]):
        raise HTTPException(status_code=400, detail="Manager not found")

    for field, value in data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()