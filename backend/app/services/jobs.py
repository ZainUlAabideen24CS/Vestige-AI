from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.models.ingestion_job import IngestionJob
from app.models.document import Document
from app.services.ingestion.chunker import chunk_text
from app.services.ai.embeddings import embed_texts
from app.services.memory.vector_store import store_chunks, delete_document_chunks


def process_document(job_id: int):
    db = SessionLocal()
    try:
        job = db.get(IngestionJob, job_id)
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        job.progress = 10
        db.commit()

        doc = db.get(Document, job.document_id)
        if not doc:
            raise ValueError("Document not found")

        with open(doc.file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        doc.extracted_text = text
        job.progress = 25
        db.commit()

        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("No text content found in file")

        job.progress = 40
        db.commit()

        vectors = embed_texts(chunks)
        job.progress = 75
        db.commit()

        delete_document_chunks(doc.id)
        store_chunks(
            document_id=doc.id,
            chunks=chunks,
            vectors=vectors,
            meta={
                "client_id": doc.client_id,
                "project_id": doc.project_id,
                "filename": doc.filename,
                "source_type": doc.source_type,
            },
        )

        doc.chunk_count = len(chunks)
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