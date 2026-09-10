from sentence_transformers import CrossEncoder

MODEL_NAME = "BAAI/bge-reranker-v2-m3"

_model = None


def get_reranker():
    global _model

    if _model is None:
        _model = CrossEncoder(MODEL_NAME)

    return _model


def rerank(question: str, hits: list[dict], top_k: int = 5) -> list[dict]:
    if not hits:
        return []

    model = get_reranker()

    pairs = [
        [question, hit["text"]]
        for hit in hits
    ]

    scores = model.predict(pairs)

    reranked = []

    for hit, score in zip(hits, scores):
        item = dict(hit)
        item["rerank_score"] = float(score)
        reranked.append(item)

    reranked.sort(
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    return reranked[:top_k]