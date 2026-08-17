from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
)

from app.core.permission import (
    accessible_project_ids,
)

from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.document import Document
from app.models.meeting import Meeting
from app.models.worklog import WorkLog


router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ========================================================
    # ACCESSIBLE PROJECTS
    # ========================================================

    allowed = accessible_project_ids(
        db,
        user,
    )

    # ========================================================
    # PROJECT QUERY
    # ========================================================

    project_query = db.query(Project)

    if allowed is not None:

        if not allowed:
            project_query = project_query.filter(
                Project.id == -1
            )

        else:
            project_query = project_query.filter(
                Project.id.in_(allowed)
            )

    # ========================================================
    # PROJECT STATUS
    # ========================================================

    project_status = dict(
        project_query
        .with_entities(
            Project.status,
            func.count(Project.id),
        )
        .group_by(
            Project.status
        )
        .all()
    )

    # ========================================================
    # RECENT PROJECTS
    # ========================================================

    recent_projects = (
        project_query
        .order_by(
            Project.created_at.desc()
        )
        .limit(5)
        .all()
    )

    # ========================================================
    # PROJECT COUNT
    # ========================================================

    projects_count = (
        project_query
        .with_entities(
            func.count(Project.id)
        )
        .scalar()
        or 0
    )

    # ========================================================
    # CLIENT QUERY
    # ========================================================

    client_query = db.query(Client)

    if allowed is not None:

        if not allowed:

            client_query = client_query.filter(
                Client.id == -1
            )

        else:

            client_ids = (
                db.query(
                    Project.client_id
                )
                .filter(
                    Project.id.in_(allowed)
                )
                .distinct()
            )

            client_query = client_query.filter(
                Client.id.in_(
                    client_ids
                )
            )

    clients_count = (
        client_query
        .with_entities(
            func.count(Client.id)
        )
        .scalar()
        or 0
    )

    active_clients_count = (
        client_query
        .filter(
            Client.status == "active"
        )
        .with_entities(
            func.count(Client.id)
        )
        .scalar()
        or 0
    )

    # ========================================================
    # DOCUMENTS
    # ========================================================

    document_query = db.query(
        Document
    )

    if allowed is not None:

        if not allowed:

            document_query = document_query.filter(
                Document.id == -1
            )

        else:

            document_query = document_query.filter(
                Document.project_id.in_(
                    allowed
                )
            )

    documents_count = (
        document_query
        .with_entities(
            func.count(Document.id)
        )
        .scalar()
        or 0
    )

    total_chunks = (
        document_query
        .with_entities(
            func.sum(
                Document.chunk_count
            )
        )
        .scalar()
        or 0
    )

    # ========================================================
    # MEETINGS
    # ========================================================

    meeting_query = db.query(
        Meeting
    )

    if allowed is not None:

        if not allowed:

            meeting_query = meeting_query.filter(
                Meeting.id == -1
            )

        else:

            meeting_query = meeting_query.filter(
                Meeting.project_id.in_(
                    allowed
                )
            )

    meetings_count = (
        meeting_query
        .with_entities(
            func.count(Meeting.id)
        )
        .scalar()
        or 0
    )

    # ========================================================
    # WORK LOGS
    # ========================================================

    worklog_query = db.query(
        WorkLog
    )

    if allowed is not None:

        if not allowed:

            worklog_query = worklog_query.filter(
                WorkLog.id == -1
            )

        else:

            worklog_query = worklog_query.filter(
                WorkLog.project_id.in_(
                    allowed
                )
            )

    recent_logs = (
        worklog_query
        .order_by(
            WorkLog.created_at.desc()
        )
        .limit(5)
        .all()
    )

    # ========================================================
    # WORK LOG USER NAMES
    # ========================================================

    log_user_ids = {
        log.user_id
        for log in recent_logs
        if log.user_id is not None
    }

    if log_user_ids:

        log_users = dict(
            db.query(
                User.id,
                User.full_name,
            )
            .filter(
                User.id.in_(
                    log_user_ids
                )
            )
            .all()
        )

    else:
        log_users = {}

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "clients": int(
            clients_count
        ),

        "active_clients": int(
            active_clients_count
        ),

        "projects": int(
            projects_count
        ),

        "project_status": project_status,

        "documents": int(
            documents_count
        ),

        "meetings": int(
            meetings_count
        ),

        "chunks": int(
            total_chunks
        ),

        "recent_projects": [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "client_id": p.client_id,
            }
            for p in recent_projects
        ],

        "recent_logs": [
            {
                "id": log.id,
                "user_name": (
                    log_users.get(
                        log.user_id
                    )
                ),
                "summary": log.summary,
                "log_date": str(
                    log.log_date
                ),
                "technologies": (
                    log.technologies
                ),
            }
            for log in recent_logs
        ],
    }