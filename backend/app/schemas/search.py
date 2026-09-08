from pydantic import BaseModel


class SearchHit(BaseModel):
    text: str
    document_id: int | None
    chunk_index: int | None
    client_id: int | None
    project_id: int | None
    filename: str | None = None
    score: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]


class AskRequest(BaseModel):
    question: str
    client_id: int | None = None
    project_id: int | None = None


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SearchHit]   