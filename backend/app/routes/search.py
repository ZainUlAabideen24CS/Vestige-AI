from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permission import accessible_project_ids
from app.models.user import User
from app.models.document import Document
from app.models.meeting import Meeting
from app.services.memory.retriever import answer_question
from app.services.memory.vector_store import search as vector_search
from app.services.ai.embeddings import embed_query
from app.schemas.search import AskRequest, AskResponse, SearchResponse, SearchHit

router = APIRouter(prefix="/search", tags=["search"])

def resolve_source_names(db: Session, hits: list[dict]):
    doc_ids = {h["document_id"] for h in hits if h["document_id"] and h["document_id"] > 0}
    meet_ids = {abs(h["document_id"]) for h in hits if h["document_id"] and h["document_id"] < 0}
    
    names = {}
    if doc_ids:
        docs = db.query(Document.id, Document.filename).filter(Document.id.in_(doc_ids)).all()
        for d in docs: names[d.id] = d.filename
    if meet_ids:
        meets = db.query(Meeting.id, Meeting.title).filter(Meeting.id.in_(meet_ids)).all()
        for m in meets: names[-m.id] = m.title
    return names

@router.post("/ask", response_model=AskResponse)
def ask(payload: AskRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    allowed = accessible_project_ids(db, user)
    
    if payload.project_id and allowed is not None:
        if payload.project_id not in allowed:
            raise HTTPException(status_code=403, detail="No access to this project")

    result = answer_question(
        payload.question,
        client_id=payload.client_id,
        project_id=payload.project_id,
        allowed_projects=allowed
    )

    names = resolve_source_names(db, result["sources"])
    sources = [
        SearchHit(
            text=s["text"], document_id=s["document_id"], chunk_index=s["chunk_index"],
            client_id=s["client_id"], project_id=s["project_id"], score=s["score"],
            filename=names.get(s["document_id"]) or s.get("filename")
        ) for s in result["sources"]
    ]
    return AskResponse(question=payload.question, answer=result["answer"], sources=sources)