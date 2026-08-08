import time
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.models.ingestion_job import IngestionJob
from app.models.document import Document


def process_document(job_id: int):
    db = SessionLocal()
    try:
        job = db.get(IngestionJob, job_id)
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        doc = db.get(Document, job.document_id)
        if not doc:
            raise ValueError("Document not found")

        with open(doc.file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        job.progress = 40
        db.commit()
        time.sleep(2)

        doc.extracted_text = text
        doc.chunk_count = 0
        job.progress = 80
        db.commit()
        time.sleep(2)

        job.status = "done"
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        job = db.get(IngestionJob, job_id)
        if job:
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()