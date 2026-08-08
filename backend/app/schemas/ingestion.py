from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IngestionJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_type: str
    status: str
    progress: int
    document_id: int | None
    meeting_id: int | None
    created_by: int | None
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    source_type: str
    project_id: int | None
    client_id: int | None
    uploaded_by: int | None
    summary: str | None
    chunk_count: int
    created_at: datetime