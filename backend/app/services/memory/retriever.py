import time

from app.services.ai.embeddings import embed_query
from app.services.ai.llm import generate_answer
from app.services.ai.reranker import rerank
from app.services.memory.vector_store import search

MIN_SCORE = 0.55


def answer_question(
    question: str,
    client_id: int | None = None,
    project_id: int | None = None,
    top_k: int = 3,
    allowed_projects: list[int] | None = None,
) -> dict:

    t0 = time.time()
    vector = embed_query(question)
    t1 = time.time()

    # First retrieve candidates from Qdrant
    hits = search(
        vector,
        limit=6,
        client_id=client_id,
        project_id=project_id,
        allowed_projects=allowed_projects,
    )
    t2 = time.time()

    # Remove very weak semantic matches
    candidates = [h for h in hits if h["score"] >= MIN_SCORE]

    if not candidates:
        print(f"[timing] embed {t1-t0:.1f}s | search {t2-t1:.1f}s | no candidates")
        return {
            "answer": "I don't have enough information to answer that.",
            "sources": [],
        }

    # Now determine which passages actually answer the question
    relevant = rerank(question, candidates, top_k=top_k)
    t3 = time.time()

    answer = generate_answer(question, [h["text"] for h in relevant])
    t4 = time.time()

    print(
        f"[timing] embed {t1-t0:.1f}s | search {t2-t1:.1f}s | "
        f"rerank {t3-t2:.1f}s | generate {t4-t3:.1f}s | total {t4-t0:.1f}s"
    )

    return {
        "answer": answer,
        "sources": relevant,
    }