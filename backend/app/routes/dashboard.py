from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.document import Document
from app.models.meeting import Meeting

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project_status = dict(
        db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    )

    recent_projects = (
        db.query(Project).order_by(Project.created_at.desc()).limit(5).all()
    )

    total_chunks = db.query(func.sum(Document.chunk_count)).scalar() or 0

    return {
        "clients": db.query(func.count(Client.id)).scalar(),
        "active_clients": db.query(func.count(Client.id)).filter(Client.status == "active").scalar(),
        "projects": db.query(func.count(Project.id)).scalar(),
        "project_status": project_status,
        "documents": db.query(func.count(Document.id)).scalar(),
        "meetings": db.query(func.count(Meeting.id)).scalar(),
        "chunks": int(total_chunks),
        "recent_projects": [
            {"id": p.id, "name": p.name, "status": p.status, "client_id": p.client_id}
            for p in recent_projects
        ],
    }