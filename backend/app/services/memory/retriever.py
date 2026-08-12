from app.services.ai.embeddings import embed_query
from app.services.ai.llm import generate_answer
from app.services.memory.vector_store import search
from app.services.ai.reranker import rerank

MIN_SCORE = 0.55


def answer_question(
    question: str,
    client_id: int | None = None,
    project_id: int | None = None,
    top_k: int = 5
) -> dict:

    vector = embed_query(question)

    # First retrieve candidates from Qdrant
    hits = search(
        vector,
        limit=10,
        client_id=client_id,
        project_id=project_id
    )

    # Remove very weak semantic matches
    candidates = [
        h for h in hits
        if h["score"] >= MIN_SCORE
    ]

    if not candidates:
        return {
            "answer": "I don't have enough information to answer that.",
            "sources": [],
        }

    # Now determine which passages actually answer the question
    relevant = rerank(
        question,
        candidates,
        top_k=top_k
    )

    answer = generate_answer(
        question,
        [h["text"] for h in relevant]
    )

    return {
        "answer": answer,
        "sources": relevant
    }