import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
)

from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    get_current_user,
)

from app.core.permission import (
    accessible_project_ids,
    can_access_project,
)

from app.models.user import User
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.models.project import Project
from app.models.client import Client
from app.models.meeting import Meeting

from app.schemas.ingestion import (
    IngestionJobOut,
    DocumentOut,
)

from app.services.jobs import (
    process_document,
    process_meeting,
)

from app.services.memory.vector_store import (
    delete_document_chunks,
)


AUDIO_ALLOWED = {
    ".mp3",
    ".mp4",
    ".wav",
    ".m4a",
    ".ogg",
    ".flac",
}

ALLOWED = {
    ".txt",
    ".md",
    ".csv",
    ".json",
}


router = APIRouter(
    prefix="/ingest",
    tags=["ingestion"],
)


UPLOAD_DIR = Path(
    "app/uploads"
)


# ============================================================
# PROJECT ACCESS
# ============================================================

def check_project_access(
    db: Session,
    user: User,
    project_id: int | None,
):
    if project_id is None:
        raise HTTPException(
            status_code=400,
            detail="A project must be selected for ingestion",
        )

    project = db.get(
        Project,
        project_id,
    )

    if not project:
        raise HTTPException(
            status_code=400,
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

    return project


# ============================================================
# JOB PROJECT
# ============================================================

def job_project_id(
    db: Session,
    job: IngestionJob,
) -> int | None:

    if job.document_id is not None:

        document = db.get(
            Document,
            job.document_id,
        )

        if document:
            return document.project_id

    if job.meeting_id is not None:

        meeting = db.get(
            Meeting,
            job.meeting_id,
        )

        if meeting:
            return meeting.project_id

    return None


# ============================================================
# JOB ACCESS
# ============================================================

def can_access_job(
    db: Session,
    user: User,
    job: IngestionJob,
) -> bool:

    if user.role == "admin":
        return True

    project_id = job_project_id(
        db,
        job,
    )

    if project_id is None:
        return False

    return can_access_project(
        db,
        user,
        project_id,
    )


# ============================================================
# JOB RESPONSE
# ============================================================

def job_response(
    db: Session,
    job: IngestionJob,
):
    created_by_name = None

    if job.created_by is not None:

        creator = db.get(
            User,
            job.created_by,
        )

        if creator:
            created_by_name = (
                creator.full_name
            )

    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "document_id": job.document_id,
        "meeting_id": job.meeting_id,
        "created_by": job.created_by,
        "created_by_name": created_by_name,
        "error_message": job.error_message,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "created_at": job.created_at,
    }


# ============================================================
# DOCUMENT RESPONSE
# ============================================================

def document_response(
    db: Session,
    document: Document,
):
    uploaded_by_name = None

    if document.uploaded_by is not None:

        uploader = db.get(
            User,
            document.uploaded_by,
        )

        if uploader:
            uploaded_by_name = (
                uploader.full_name
            )

    return {
        "id": document.id,
        "filename": document.filename,
        "source_type": document.source_type,
        "project_id": document.project_id,
        "client_id": document.client_id,
        "uploaded_by": document.uploaded_by,
        "uploaded_by_name": uploaded_by_name,
        "summary": document.summary,
        "chunk_count": document.chunk_count,
        "created_at": document.created_at,
    }


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post(
    "/upload",
    response_model=IngestionJobOut,
    status_code=201,
)
async def upload(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    source_type: str = Form("file"),
    project_id: int | None = Form(None),
    client_id: int | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    ext = Path(
        file.filename or ""
    ).suffix.lower()

    if ext not in ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                f"Allowed: {', '.join(sorted(ALLOWED))}"
            ),
        )

    # ========================================================
    # PROJECT
    # ========================================================

    check_project_access(
        db,
        user,
        project_id,
    )

    # ========================================================
    # CLIENT
    # ========================================================

    if client_id:

        client = db.get(
            Client,
            client_id,
        )

        if not client:
            raise HTTPException(
                status_code=400,
                detail="Client not found",
            )

    # ========================================================
    # SAVE FILE
    # ========================================================

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_path = (
        UPLOAD_DIR
        / f"{uuid.uuid4().hex}{ext}"
    )

    stored_path.write_bytes(
        await file.read()
    )

    # ========================================================
    # REMOVE EXISTING DOCUMENT
    # ========================================================

    existing = (
        db.query(Document)
        .filter(
            Document.filename
            == (
                file.filename
                or stored_path.name
            )
        )
        .filter(
            Document.client_id
            == client_id
        )
        .filter(
            Document.project_id
            == project_id
        )
        .first()
    )

    if existing:

        db.query(
            IngestionJob
        ).filter(
            IngestionJob.document_id
            == existing.id
        ).delete()

        delete_document_chunks(
            existing.id
        )

        db.delete(
            existing
        )

        db.commit()

    # ========================================================
    # CREATE DOCUMENT
    # ========================================================

    doc = Document(
        filename=(
            file.filename
            or stored_path.name
        ),
        file_path=str(
            stored_path
        ),
        source_type=source_type,
        project_id=project_id,
        client_id=client_id,
        uploaded_by=user.id,
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    # ========================================================
    # CREATE JOB
    # ========================================================

    job = IngestionJob(
        job_type="document",
        status="pending",
        document_id=doc.id,
        created_by=user.id,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(
        process_document,
        job.id,
    )

    return job_response(
        db,
        job,
    )


# ============================================================
# UPLOAD AUDIO / MEETING
# ============================================================

@router.post(
    "/audio",
    response_model=IngestionJobOut,
    status_code=201,
)
async def upload_audio(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    project_id: int | None = Form(None),
    client_id: int | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    ext = Path(
        file.filename or ""
    ).suffix.lower()

    if ext not in AUDIO_ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported audio type. "
                f"Allowed: {', '.join(sorted(AUDIO_ALLOWED))}"
            ),
        )

    # ========================================================
    # PROJECT
    # ========================================================

    check_project_access(
        db,
        user,
        project_id,
    )

    # ========================================================
    # CLIENT
    # ========================================================

    if client_id:

        client = db.get(
            Client,
            client_id,
        )

        if not client:
            raise HTTPException(
                status_code=400,
                detail="Client not found",
            )

    # ========================================================
    # SAVE AUDIO
    # ========================================================

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_path = (
        UPLOAD_DIR
        / f"{uuid.uuid4().hex}{ext}"
    )

    stored_path.write_bytes(
        await file.read()
    )

    # ========================================================
    # REMOVE EXISTING MEETING
    # ========================================================

    existing = (
        db.query(Meeting)
        .filter(
            Meeting.title == title
        )
        .filter(
            Meeting.client_id
            == client_id
        )
        .filter(
            Meeting.project_id
            == project_id
        )
        .first()
    )

    if existing:

        db.query(
            IngestionJob
        ).filter(
            IngestionJob.meeting_id
            == existing.id
        ).delete()

        delete_document_chunks(
            -existing.id
        )

        db.delete(
            existing
        )

        db.commit()

    # ========================================================
    # CREATE MEETING
    # ========================================================

    meeting = Meeting(
        title=title,
        audio_path=str(
            stored_path
        ),
        project_id=project_id,
        client_id=client_id,
    )

    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # ========================================================
    # CREATE JOB
    # ========================================================

    job = IngestionJob(
        job_type="meeting",
        status="pending",
        meeting_id=meeting.id,
        created_by=user.id,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(
        process_meeting,
        job.id,
    )

    return job_response(
        db,
        job,
    )


# ============================================================
# LIST JOBS
# ============================================================

@router.get(
    "/jobs",
    response_model=list[IngestionJobOut],
)
def list_jobs(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    query = db.query(
        IngestionJob
    )

    if user.role != "admin":

        allowed_projects = (
            accessible_project_ids(
                db,
                user,
            )
        )

        if not allowed_projects:
            return []

        document_ids = (
            db.query(
                Document.id
            )
            .filter(
                Document.project_id.in_(
                    allowed_projects
                )
            )
            .subquery()
        )

        meeting_ids = (
            db.query(
                Meeting.id
            )
            .filter(
                Meeting.project_id.in_(
                    allowed_projects
                )
            )
            .subquery()
        )

        query = query.filter(
            (
                IngestionJob.document_id.in_(
                    document_ids
                )
            )
            |
            (
                IngestionJob.meeting_id.in_(
                    meeting_ids
                )
            )
        )

    jobs = (
        query
        .order_by(
            IngestionJob.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        job_response(
            db,
            job,
        )
        for job in jobs
    ]


# ============================================================
# GET SINGLE JOB
# ============================================================

@router.get(
    "/jobs/{job_id}",
    response_model=IngestionJobOut,
)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    job = db.get(
        IngestionJob,
        job_id,
    )

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    if not can_access_job(
        db,
        user,
        job,
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have access "
                "to this ingestion job"
            ),
        )

    return job_response(
        db,
        job,
    )


# ============================================================
# LIST DOCUMENTS
# ============================================================

@router.get(
    "/documents",
    response_model=list[DocumentOut],
)
def list_documents(
    project_id: int | None = None,
    client_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    q = db.query(
        Document
    )

    # ========================================================
    # PROJECT FILTER
    # ========================================================

    if project_id is not None:

        if not can_access_project(
            db,
            user,
            project_id,
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You do not have access "
                    "to this project"
                ),
            )

        q = q.filter(
            Document.project_id
            == project_id
        )

    else:

        if user.role != "admin":

            allowed_projects = (
                accessible_project_ids(
                    db,
                    user,
                )
            )

            if not allowed_projects:
                return []

            q = q.filter(
                Document.project_id.in_(
                    allowed_projects
                )
            )

    # ========================================================
    # CLIENT FILTER
    # ========================================================

    if client_id is not None:

        q = q.filter(
            Document.client_id
            == client_id
        )

    # ========================================================
    # RESULT
    # ========================================================

    documents = (
        q
        .order_by(
            Document.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        document_response(
            db,
            document,
        )
        for document in documents
    ]