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

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
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
from app.models.dialogue_turn import DialogueTurn

from app.schemas.ingestion import (
    IngestionJobOut,
    DocumentOut,
)

from app.services.jobs import (
    process_document,
    process_meeting,
    reembed_meeting,
)

from app.services.ingestion.audio_converter import (
    convert_to_mp3,
)

from app.services.memory.vector_store import (
    delete_document_chunks,
)


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

AUDIO_ALLOWED = {
    ".mp3",
    ".mp4",
    ".wav",
    ".m4a",
    ".ogg",
    ".flac",
    ".aac",
    ".webm",
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

UPLOAD_DIR = Path("app/uploads")


# ============================================================
# SCHEMAS
# ============================================================

class SpeakerCorrection(BaseModel):
    speaker_label: str
    speaker_name: str
    speaker_user_id: int | None = None


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
            created_by_name = creator.full_name

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
            uploaded_by_name = uploader.full_name

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
# MEETING RESPONSE
# ============================================================

def meeting_response(
    db: Session,
    meeting: Meeting,
):
    """
    Build the API response for a completed meeting.

    Participants are dynamically generated from DialogueTurn.

    Example:

        SPEAKER_00 -> Zain
        SPEAKER_01 -> Uzair
        SPEAKER_02 -> Ramzan

    becomes:

        "participants": "Zain, Uzair, Ramzan"
    """

    # ========================================================
    # UPLOADED BY NAME
    # ========================================================

    uploaded_by_name = None

    if meeting.uploaded_by:

        uploader = (
            db.query(User)
            .filter(
                User.id == meeting.uploaded_by
            )
            .first()
        )

        if uploader:
            uploaded_by_name = uploader.full_name

    # ========================================================
    # GET DETECTED SPEAKERS
    # ========================================================

    speaker_rows = (
        db.query(
            DialogueTurn.speaker_label,
            DialogueTurn.speaker_name,
        )
        .filter(
            DialogueTurn.meeting_id == meeting.id
        )
        .order_by(
            DialogueTurn.start_time.asc()
        )
        .all()
    )

    detected_speakers = []

    for speaker_label, speaker_name in speaker_rows:

        name = (
            speaker_name
            or ""
        ).strip()

        # If no human-readable name exists,
        # use diarization label.
        if not name:
            name = (
                speaker_label
                or ""
            ).strip()

        if not name:
            name = "Unknown Speaker"

        if name not in detected_speakers:
            detected_speakers.append(name)

    # ========================================================
    # PARTICIPANTS
    # ========================================================

    if detected_speakers:

        participants = ", ".join(
            detected_speakers
        )

    else:

        participants = meeting.participants

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "id": meeting.id,
        "title": meeting.title,
        "project_id": meeting.project_id,
        "client_id": meeting.client_id,
        "duration_seconds": meeting.duration_seconds,
        "participants": participants,
        "uploaded_by": meeting.uploaded_by,
        "uploaded_by_name": uploaded_by_name,
        "summary": meeting.summary,
        "created_at": meeting.created_at,
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

    # ========================================================
    # VALIDATE EXTENSION
    # ========================================================

    ext = Path(
        file.filename or ""
    ).suffix.lower()

    if ext not in ALLOWED:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. Allowed: "
                f"{', '.join(sorted(ALLOWED))}"
            ),
        )

    # ========================================================
    # PROJECT ACCESS
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

        if not db.get(
            Client,
            client_id,
        ):

            raise HTTPException(
                status_code=400,
                detail="Client not found",
            )

    # ========================================================
    # CREATE UPLOAD DIRECTORY
    # ========================================================

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ========================================================
    # SAVE FILE
    # ========================================================

    stored_path = (
        UPLOAD_DIR
        / f"{uuid.uuid4().hex}{ext}"
    )

    try:

        file_content = await file.read()

        if not file_content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty",
            )

        stored_path.write_bytes(
            file_content
        )

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"[UPLOAD] Document save failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save document: {str(e)}",
        )

    # ========================================================
    # CREATE DOCUMENT
    # ========================================================

    try:

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

        # ====================================================
        # CREATE INGESTION JOB
        # ====================================================

        job = IngestionJob(
            job_type="document",
            status="pending",
            document_id=doc.id,
            created_by=user.id,
        )

        db.add(job)
        db.commit()
        db.refresh(job)

    except Exception as e:

        db.rollback()

        # Cleanup file if DB creation fails.
        try:
            if stored_path.exists():
                stored_path.unlink()
        except Exception:
            pass

        print(
            f"[UPLOAD] Document DB creation failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create document: {str(e)}",
        )

    # ========================================================
    # START BACKGROUND PROCESSING
    # ========================================================

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
    participants: str | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    # ========================================================
    # VALIDATE EXTENSION
    # ========================================================

    ext = Path(
        file.filename or ""
    ).suffix.lower()

    if ext not in AUDIO_ALLOWED:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported audio type. Allowed: "
                f"{', '.join(sorted(AUDIO_ALLOWED))}"
            ),
        )

    # ========================================================
    # PROJECT ACCESS
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

        if not db.get(
            Client,
            client_id,
        ):

            raise HTTPException(
                status_code=400,
                detail="Client not found",
            )

    # ========================================================
    # CREATE UPLOAD DIRECTORY
    # ========================================================

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ========================================================
    # SAVE ORIGINAL FILE
    # ========================================================

    original_path = (
        UPLOAD_DIR
        / f"{uuid.uuid4().hex}{ext}"
    )

    try:

        file_content = await file.read()

        if not file_content:

            raise HTTPException(
                status_code=400,
                detail="Uploaded audio file is empty",
            )

        original_path.write_bytes(
            file_content
        )

    except HTTPException:
        raise

    except Exception as e:

        print(
            f"[AUDIO] Failed to save uploaded file: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save audio file: {str(e)}",
        )

    print(
        f"[AUDIO] Uploaded original file: "
        f"{original_path}"
    )

    # ========================================================
    # AUTOMATIC CONVERSION
    # ========================================================
    #
    # MP3  -> no conversion
    # MP4  -> MP3
    # WAV  -> MP3
    # M4A  -> MP3
    # OGG  -> MP3
    # FLAC -> MP3
    # AAC  -> MP3
    # WEBM -> MP3
    #
    # IMPORTANT:
    #
    # Meeting is NOT created in DB until conversion
    # succeeds.
    #
    # ========================================================

    try:

        stored_path = Path(
            convert_to_mp3(
                str(original_path)
            )
        )

    except Exception as e:

        print(
            f"[AUDIO] Conversion failed: {e}"
        )

        # Cleanup original file.
        try:

            if original_path.exists():
                original_path.unlink()

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=(
                f"Audio conversion failed: {str(e)}"
            ),
        )

    print(
        f"[AUDIO] Final file for transcription: "
        f"{stored_path}"
    )

    # ========================================================
    # CREATE MEETING
    # ========================================================

    try:

        meeting = Meeting(
            title=title,
            audio_path=str(stored_path),
            project_id=project_id,
            client_id=client_id,
            participants=participants,
            uploaded_by=user.id,
        )

        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        # ====================================================
        # CREATE MEETING INGESTION JOB
        # ====================================================

        job = IngestionJob(
            job_type="meeting",
            status="pending",
            meeting_id=meeting.id,
            created_by=user.id,
        )

        db.add(job)
        db.commit()
        db.refresh(job)

    except Exception as e:

        db.rollback()

        # Cleanup converted file.
        try:

            if stored_path.exists():
                stored_path.unlink()

        except Exception:
            pass

        # Cleanup original file if it still exists.
        try:

            if original_path.exists():
                original_path.unlink()

        except Exception:
            pass

        print(
            f"[AUDIO] Meeting DB creation failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create meeting: {str(e)}",
        )

    # ========================================================
    # START BACKGROUND PROCESSING
    # ========================================================

    background.add_task(
        process_meeting,
        job.id,
    )

    return job_response(
        db,
        job,
    )


# ============================================================
# MEETING DIALOGUE
# ============================================================

@router.get(
    "/meetings/{meeting_id}/dialogue"
)
def get_dialogue(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    meeting = db.get(
        Meeting,
        meeting_id,
    )

    if not meeting:

        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    # ========================================================
    # ONLY COMPLETED MEETINGS ARE ACCESSIBLE
    # ========================================================

    completed_job = (
        db.query(IngestionJob)
        .filter(
            IngestionJob.meeting_id == meeting_id,
            IngestionJob.status == "done",
        )
        .first()
    )

    if not completed_job:

        raise HTTPException(
            status_code=404,
            detail="Meeting is not fully processed yet",
        )

    # ========================================================
    # PROJECT ACCESS
    # ========================================================

    if (
        meeting.project_id
        and not can_access_project(
            db,
            user,
            meeting.project_id,
        )
    ):

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this meeting",
        )

    # ========================================================
    # GET TURNS
    # ========================================================

    turns = (
        db.query(DialogueTurn)
        .filter(
            DialogueTurn.meeting_id == meeting_id
        )
        .order_by(
            DialogueTurn.turn_order
        )
        .all()
    )

    speakers: dict[str, dict] = {}

    for t in turns:

        speakers.setdefault(
            t.speaker_label,
            {
                "speaker_label": t.speaker_label,
                "speaker_name": t.speaker_name,
                "speaker_user_id": t.speaker_user_id,
                "confirmed": t.name_confirmed,
            },
        )

    return {
        "meeting_id": meeting_id,
        "title": meeting.title,
        "duration_seconds": meeting.duration_seconds,
        "speakers": list(
            speakers.values()
        ),
        "turns": [
            {
                "id": t.id,
                "turn_order": t.turn_order,
                "speaker_label": t.speaker_label,
                "speaker_name": t.speaker_name,
                "text": t.text,
                "text_en": t.text_en,
                "start_time": t.start_time,
                "end_time": t.end_time,
            }
            for t in turns
        ],
    }


# ============================================================
# CORRECT SPEAKER
# ============================================================

@router.patch(
    "/meetings/{meeting_id}/speakers"
)
def correct_speaker(
    meeting_id: int,
    payload: SpeakerCorrection,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    meeting = db.get(
        Meeting,
        meeting_id,
    )

    if not meeting:

        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    # ========================================================
    # PROJECT ACCESS
    # ========================================================

    if (
        meeting.project_id
        and not can_access_project(
            db,
            user,
            meeting.project_id,
        )
    ):

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this meeting",
        )

    # ========================================================
    # USER VALIDATION
    # ========================================================

    if payload.speaker_user_id is not None:

        if not db.get(
            User,
            payload.speaker_user_id,
        ):

            raise HTTPException(
                status_code=400,
                detail="User not found",
            )

    # ========================================================
    # UPDATE DIALOGUE TURNS
    # ========================================================

    updated = (
        db.query(DialogueTurn)
        .filter(
            DialogueTurn.meeting_id == meeting_id
        )
        .filter(
            DialogueTurn.speaker_label
            == payload.speaker_label
        )
        .update(
            {
                "speaker_name": payload.speaker_name,
                "speaker_user_id": payload.speaker_user_id,
                "name_confirmed": True,
            }
        )
    )

    # ========================================================
    # ALSO UPDATE MEETING.PARTICIPANTS
    # ========================================================
    #
    # This keeps the main Meeting record synchronized
    # when a speaker is manually corrected from the UI.
    #
    # ========================================================

    if updated:

        speaker_rows = (
            db.query(
                DialogueTurn.speaker_label,
                DialogueTurn.speaker_name,
            )
            .filter(
                DialogueTurn.meeting_id == meeting_id
            )
            .all()
        )

        participant_names = []

        for speaker_label, speaker_name in speaker_rows:

            name = (
                speaker_name
                or ""
            ).strip()

            if not name:
                name = (
                    speaker_label
                    or ""
                ).strip()

            if not name:
                continue

            if name not in participant_names:
                participant_names.append(name)

        if participant_names:

            meeting.participants = ", ".join(
                participant_names
            )

    db.commit()

    # ========================================================
    # RE-EMBED
    # ========================================================

    if updated:

        background.add_task(
            reembed_meeting,
            meeting_id,
        )

    return {
        "updated": updated,
        "reembedding": bool(updated),
    }


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

        allowed_projects = accessible_project_ids(
            db,
            user,
        )

        if not allowed_projects:
            return []

        # ----------------------------------------------------
        # DOCUMENT IDS
        # ----------------------------------------------------

        doc_ids = [
            r[0]
            for r in (
                db.query(Document.id)
                .filter(
                    Document.project_id.in_(
                        allowed_projects
                    )
                )
                .all()
            )
        ]

        # ----------------------------------------------------
        # MEETING IDS
        # ----------------------------------------------------

        meet_ids = [
            r[0]
            for r in (
                db.query(Meeting.id)
                .filter(
                    Meeting.project_id.in_(
                        allowed_projects
                    )
                )
                .all()
            )
        ]

        # ----------------------------------------------------
        # FILTER JOBS
        # ----------------------------------------------------

        filters = []

        if doc_ids:
            filters.append(
                IngestionJob.document_id.in_(
                    doc_ids
                )
            )

        if meet_ids:
            filters.append(
                IngestionJob.meeting_id.in_(
                    meet_ids
                )
            )

        if not filters:
            return []

        query = query.filter(
            filters[0]
            if len(filters) == 1
            else filters[0] | filters[1]
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

    # ========================================================
    # BASE QUERY
    # ========================================================

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
                detail="You do not have access to this project",
            )

        q = q.filter(
            Document.project_id == project_id
        )

    else:

        if user.role != "admin":

            allowed_projects = accessible_project_ids(
                db,
                user,
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
            Document.client_id == client_id
        )

    # ========================================================
    # IMPORTANT:
    #
    # ONLY SHOW DOCUMENTS WHOSE INGESTION JOB IS DONE.
    #
    # pending    -> HIDE
    # processing -> HIDE
    # failed     -> HIDE
    # done       -> SHOW
    #
    # This prevents a document from appearing immediately
    # after upload.
    # ========================================================

    completed_document_ids = (
        db.query(
            IngestionJob.document_id
        )
        .filter(
            IngestionJob.document_id.isnot(None),
            IngestionJob.status == "done",
        )
        .subquery()
    )

    q = q.filter(
        Document.id.in_(
            completed_document_ids
        )
    )

    # ========================================================
    # GET DOCUMENTS
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


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get(
    "/documents/{document_id}",
    response_model=DocumentOut,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    document = db.get(
        Document,
        document_id,
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # ========================================================
    # ONLY COMPLETED DOCUMENTS ARE ACCESSIBLE
    # ========================================================

    completed_job = (
        db.query(IngestionJob)
        .filter(
            IngestionJob.document_id == document_id,
            IngestionJob.status == "done",
        )
        .first()
    )

    if not completed_job:

        raise HTTPException(
            status_code=404,
            detail="Document is not fully processed yet",
        )

    # ========================================================
    # PROJECT ACCESS
    # ========================================================

    if (
        document.project_id
        and not can_access_project(
            db,
            user,
            document.project_id,
        )
    ):

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this document",
        )

    return document_response(
        db,
        document,
    )


# ============================================================
# GET SINGLE MEETING
# ============================================================

@router.get(
    "/meetings/{meeting_id}"
)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    meeting = db.get(
        Meeting,
        meeting_id,
    )

    if not meeting:

        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    # ========================================================
    # ONLY COMPLETED MEETINGS ARE ACCESSIBLE
    # ========================================================

    completed_job = (
        db.query(IngestionJob)
        .filter(
            IngestionJob.meeting_id == meeting_id,
            IngestionJob.status == "done",
        )
        .first()
    )

    if not completed_job:

        raise HTTPException(
            status_code=404,
            detail="Meeting is not fully processed yet",
        )

    # ========================================================
    # PROJECT ACCESS
    # ========================================================

    if (
        meeting.project_id
        and not can_access_project(
            db,
            user,
            meeting.project_id,
        )
    ):

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this meeting",
        )

    return meeting_response(
        db,
        meeting,
    )


# ============================================================
# LIST MEETINGS
# ============================================================

@router.get(
    "/meetings"
)
def list_meetings(
    project_id: int | None = None,
    client_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    # ========================================================
    # BASE QUERY
    # ========================================================

    q = db.query(
        Meeting
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
                detail="You do not have access to this project",
            )

        q = q.filter(
            Meeting.project_id == project_id
        )

    else:

        if user.role != "admin":

            allowed_projects = accessible_project_ids(
                db,
                user,
            )

            if not allowed_projects:
                return []

            q = q.filter(
                Meeting.project_id.in_(
                    allowed_projects
                )
            )

    # ========================================================
    # CLIENT FILTER
    # ========================================================

    if client_id is not None:

        q = q.filter(
            Meeting.client_id == client_id
        )

    # ========================================================
    # IMPORTANT:
    #
    # ONLY SHOW MEETINGS WHOSE INGESTION JOB IS DONE.
    #
    # pending    -> HIDE
    # processing -> HIDE
    # failed     -> HIDE
    # done       -> SHOW
    #
    # This is the main fix for your screenshot issue.
    # ========================================================

    completed_meeting_ids = (
        db.query(
            IngestionJob.meeting_id
        )
        .filter(
            IngestionJob.meeting_id.isnot(None),
            IngestionJob.status == "done",
        )
        .subquery()
    )

    q = q.filter(
        Meeting.id.in_(
            completed_meeting_ids
        )
    )

    # ========================================================
    # GET MEETINGS
    # ========================================================

    meetings = (
        q
        .order_by(
            Meeting.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        meeting_response(
            db,
            meeting,
        )
        for meeting in meetings
    ]