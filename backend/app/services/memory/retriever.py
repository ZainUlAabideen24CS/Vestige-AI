from app.services.ai.embeddings import embed_query
from app.services.ai.llm import generate_answer
from app.services.ai.reranker import rerank
from app.services.memory.vector_store import search


def _add_relevance(hits: list[dict]) -> list[dict]:
    """
    Cross-encoder rerank scores are raw, unbounded logits (e.g. -4.8,
    +2.1) -- they are NOT a 0-1 or 0-100 scale, so showing them
    directly (or the raw cosine score) as a "% match" is misleading.

    This converts them into an intuitive 0-100 "relevance" number,
    scaled relative to the best/worst score in THIS result set.
    It only affects what's displayed -- ranking order is already
    decided by rerank_score before this runs.
    """
    if not hits:
        return hits

    scores = [h.get("rerank_score", 0.0) for h in hits]
    hi, lo = max(scores), min(scores)
    spread = hi - lo

    for h in hits:
        if spread <= 0:
            h["relevance"] = 90
        else:
            normalized = (h.get("rerank_score", 0.0) - lo) / spread
            h["relevance"] = round(40 + normalized * 60)

    return hits


def answer_question(
    question: str,
    client_id: int | None = None,
    project_id: int | None = None,
    top_k: int = 4,
    allowed_projects: list[int] | None = None,
) -> dict:
    vector = embed_query(question)

    hits = search(
        vector,
        limit=15,
        client_id=client_id,
        project_id=project_id,
        allowed_projects=allowed_projects,
    )

    if not hits:
        return {
            "answer": "I don't have enough information in this project's context to answer that.",
            "sources": [],
        }

    # Always cap to top_k -- don't dump every chunk just because the
    # collection happens to be small.
    relevant = rerank(question, hits, top_k=top_k)
    relevant = _add_relevance(relevant)

    answer = generate_answer(question, [h["text"] for h in relevant])

    return {
        "answer": answer,
        "sources": relevant,
    }