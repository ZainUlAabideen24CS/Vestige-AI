import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.models.project import Project
from app.models.client import Client
from app.schemas.ingestion import IngestionJobOut, DocumentOut
from app.services.jobs import process_document

router = APIRouter(prefix="/ingest", tags=["ingestion"])

UPLOAD_DIR = Path("app/uploads")
ALLOWED = {".txt", ".md", ".csv", ".json"}


@router.post("/upload", response_model=IngestionJobOut, status_code=201)
async def upload(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    source_type: str = Form("file"),
    project_id: int | None = Form(None),
    client_id: int | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED))}")

    if project_id and not db.get(Project, project_id):
        raise HTTPException(400, "Project not found")
    if client_id and not db.get(Client, client_id):
        raise HTTPException(400, "Client not found")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    stored_path.write_bytes(await file.read())

    doc = Document(
        filename=file.filename or stored_path.name,
        file_path=str(stored_path),
        source_type=source_type,
        project_id=project_id,
        client_id=client_id,
        uploaded_by=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    job = IngestionJob(
        job_type="document",
        status="pending",
        document_id=doc.id,
        created_by=user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(process_document, job.id)
    return job


@router.get("/jobs", response_model=list[IngestionJobOut])
def list_jobs(limit: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(limit).all()


@router.get("/jobs/{job_id}", response_model=IngestionJobOut)
def get_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.get(IngestionJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    project_id: int | None = None,
    client_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Document)
    if project_id:
        q = q.filter(Document.project_id == project_id)
    if client_id:
        q = q.filter(Document.client_id == client_id)
    return q.order_by(Document.created_at.desc()).limit(limit).all()