from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IngestionJobOut(BaseModel):
    id: int
    job_type: str
    status: str
    progress: int
    document_id: int | None
    meeting_id: int | None
    created_by: int | None

    # NEW
    created_by_name: str | None = None

    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DocumentOut(BaseModel):
    id: int
    filename: str
    source_type: str
    project_id: int | None
    client_id: int | None
    uploaded_by: int | None

    # NEW
    uploaded_by_name: str | None = None

    summary: str | None
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )