from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permission import accessible_project_ids
from app.models.worklog import WorkLog
from app.models.project import Project
from app.models.user import User
from app.schemas.worklog import WorkLogCreate, WorkLogUpdate, WorkLogOut

router = APIRouter(prefix="/worklogs", tags=["worklogs"])


def to_out(log: WorkLog, users: dict, projects: dict) -> WorkLogOut:
    out = WorkLogOut.model_validate(log)
    out.user_name = users.get(log.user_id)
    out.project_name = projects.get(log.project_id)
    return out


def enrich(db: Session, logs: list[WorkLog]) -> list[WorkLogOut]:
    if not logs:
        return []
    user_ids = {l.user_id for l in logs}
    project_ids = {l.project_id for l in logs}

    users = dict(db.query(User.id, User.full_name).filter(User.id.in_(user_ids)).all())
    projects = dict(db.query(Project.id, Project.name).filter(Project.id.in_(project_ids)).all())

    return [to_out(l, users, projects) for l in logs]


@router.get("", response_model=list[WorkLogOut])
def list_worklogs(
    project_id: int | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(WorkLog)

    allowed = accessible_project_ids(db, user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(WorkLog.project_id.in_(allowed))

    if project_id:
        query = query.filter(WorkLog.project_id == project_id)
    if user_id:
        query = query.filter(WorkLog.user_id == user_id)
    if date_from:
        query = query.filter(WorkLog.log_date >= date_from)
    if date_to:
        query = query.filter(WorkLog.log_date <= date_to)

    logs = (
        query.order_by(WorkLog.log_date.desc(), WorkLog.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return enrich(db, logs)


@router.post("", response_model=WorkLogOut, status_code=201)
def create_worklog(
    payload: WorkLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.get(Project, payload.project_id):
        raise HTTPException(status_code=400, detail="Project not found")

    allowed = accessible_project_ids(db, user)
    if allowed is not None and payload.project_id not in allowed:
        raise HTTPException(status_code=403, detail="You are not assigned to this project")

    log = WorkLog(**payload.model_dump(), user_id=user.id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return enrich(db, [log])[0]


@router.patch("/{log_id}", response_model=WorkLogOut)
def update_worklog(
    log_id: int,
    payload: WorkLogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.get(WorkLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")

    if log.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only edit your own work logs")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return enrich(db, [log])[0]


@router.delete("/{log_id}", status_code=204)
def delete_worklog(
    log_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    log = db.get(WorkLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")

    if log.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own work logs")

    db.delete(log)
    db.commit()