import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.services.ai.embeddings import VECTOR_SIZE

COLLECTION = "vestige_chunks"
_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(host="localhost", port=6333)
        ensure_collection(_client)
    return _client


def ensure_collection(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def store_chunks(document_id: int, chunks: list[str], vectors: list[list[float]], meta: dict):
    client = get_client()
    points = [
        PointStruct(
            id=uuid.uuid4().hex,
            vector=vector,
            payload={
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk,
                **meta,
            },
        )
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]
    client.upsert(collection_name=COLLECTION, points=points)


def delete_document_chunks(document_id: int):
    client = get_client()
    client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        ),
    )


def search(vector: list[float], limit: int = 5, client_id: int | None = None,
           project_id: int | None = None) -> list[dict]:
    client = get_client()

    conditions = []
    if client_id:
        conditions.append(FieldCondition(key="client_id", match=MatchValue(value=client_id)))
    if project_id:
        conditions.append(FieldCondition(key="project_id", match=MatchValue(value=project_id)))

    results = client.query_points(
        collection_name=COLLECTION,
        query=vector,
        limit=limit,
        query_filter=Filter(must=conditions) if conditions else None,
    ).points

    return [
        {
            "text": r.payload.get("text", ""),
            "document_id": r.payload.get("document_id"),
            "chunk_index": r.payload.get("chunk_index"),
            "client_id": r.payload.get("client_id"),
            "project_id": r.payload.get("project_id"),
            "filename": r.payload.get("filename"),
            "score": r.score,
        }
        for r in results
    ]