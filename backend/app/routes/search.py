from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.permission import accessible_project_ids
from app.models.user import User
from app.models.document import Document

from app.services.ai.embeddings import embed_query
from app.services.memory.vector_store import search as vector_search
from app.services.memory.retriever import answer_question

from app.schemas.search import (
    SearchHit,
    SearchResponse,
    AskRequest,
    AskResponse,
)


router = APIRouter(
    prefix="/search",
    tags=["search"],
)

MIN_SCORE = 0.55


def check_project_access(
    project_id: int | None,
    allowed_projects: list[int] | None,
):
    """
    Verify explicit project access.

    None means unrestricted access.
    """

    if project_id is None:
        return

    if allowed_projects is None:
        return

    if project_id not in allowed_projects:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this project",
        )


@router.get(
    "",
    response_model=SearchResponse,
)
def semantic_search(
    q: str = Query(
        ...,
        min_length=3,
        description="Question or phrase to search for",
    ),
    limit: int = Query(
        5,
        ge=1,
        le=20,
    ),
    client_id: int | None = None,
    project_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed = accessible_project_ids(
        db,
        user,
    )

    if allowed is not None and not allowed:
        return SearchResponse(
            query=q,
            hits=[],
        )

    check_project_access(
        project_id,
        allowed,
    )

    vector = embed_query(q)

    raw = vector_search(
        vector,
        limit=limit,
        client_id=client_id,
        project_id=project_id,
        allowed_projects=allowed,
    )

    raw = [
        r
        for r in raw
        if r["score"] >= MIN_SCORE
    ]

    doc_ids = {
        r["document_id"]
        for r in raw
        if r["document_id"]
        and r["document_id"] > 0
    }

    filenames = {}

    if doc_ids:
        docs = (
            db.query(Document)
            .filter(Document.id.in_(doc_ids))
            .all()
        )

        filenames = {
            d.id: d.filename
            for d in docs
        }

    hits = [
        SearchHit(
            text=r["text"],
            document_id=r["document_id"],
            chunk_index=r["chunk_index"],
            client_id=r["client_id"],
            project_id=r["project_id"],
            filename=(
                filenames.get(r["document_id"])
                or r.get("filename")
            ),
            score=r["score"],
        )
        for r in raw
    ]

    return SearchResponse(
        query=q,
        hits=hits,
    )


@router.post(
    "/ask",
    response_model=AskResponse,
)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    allowed = accessible_project_ids(
        db,
        user,
    )

    if allowed is not None and not allowed:
        return AskResponse(
            question=payload.question,
            answer="I don't have enough information to answer that.",
            sources=[],
        )

    check_project_access(
        payload.project_id,
        allowed,
    )

    result = answer_question(
        payload.question,
        client_id=payload.client_id,
        project_id=payload.project_id,
        allowed_projects=allowed,
    )

    doc_ids = {
        s["document_id"]
        for s in result["sources"]
        if s["document_id"]
        and s["document_id"] > 0
    }

    filenames = {}

    if doc_ids:
        docs = (
            db.query(Document)
            .filter(Document.id.in_(doc_ids))
            .all()
        )

        filenames = {
            d.id: d.filename
            for d in docs
        }

    sources = [
        SearchHit(
            text=s["text"],
            document_id=s["document_id"],
            chunk_index=s["chunk_index"],
            client_id=s["client_id"],
            project_id=s["project_id"],
            filename=(
                filenames.get(s["document_id"])
                or s.get("filename")
            ),
            score=s["score"],
        )
        for s in result["sources"]
    ]

    return AskResponse(
        question=payload.question,
        answer=result["answer"],
        sources=sources,
    )