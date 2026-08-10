from app.services.ai.embeddings import embed_query
from app.services.ai.llm import generate_answer
from app.services.memory.vector_store import search

MIN_SCORE = 0.35


def answer_question(question: str, client_id: int | None = None,
                    project_id: int | None = None, top_k: int = 4) -> dict:
    vector = embed_query(question)
    hits = search(vector, limit=top_k, client_id=client_id, project_id=project_id)

    relevant = [h for h in hits if h["score"] >= MIN_SCORE]

    if not relevant:
        return {
            "answer": "I don't have enough information to answer that.",
            "sources": [],
        }

    answer = generate_answer(question, [h["text"] for h in relevant])
    return {"answer": answer, "sources": relevant}