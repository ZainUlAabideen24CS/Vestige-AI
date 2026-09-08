import time
from app.services.ai.embeddings import embed_query
from app.services.ai.llm import generate_answer
from app.services.ai.reranker import rerank
from app.services.memory.vector_store import search

MIN_SCORE = 0.50

def answer_question(
    question: str,
    client_id: int | None = None,
    project_id: int | None = None,
    top_k: int = 3,
    allowed_projects: list[int] | None = None,
) -> dict:
    vector = embed_query(question)

    # Search with filters
    hits = search(
        vector,
        limit=12,
        client_id=client_id,
        project_id=project_id,
        allowed_projects=allowed_projects,
    )

    candidates = [h for h in hits if h["score"] >= MIN_SCORE]

    if not candidates:
        return {
            "answer": "I don't have enough information in this project's context to answer that.",
            "sources": [],
        }

    # Rerank candidates for precision
    relevant = rerank(question, candidates, top_k=top_k)

    # Generate answer from context
    answer = generate_answer(question, [h["text"] for h in relevant])

    return {
        "answer": answer,
        "sources": relevant,
    }