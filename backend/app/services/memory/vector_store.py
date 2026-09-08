import uuid
import os
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
)
from app.services.ai.embeddings import VECTOR_SIZE

COLLECTION = "vestige_chunks"
_client: QdrantClient | None = None

def get_client() -> QdrantClient:
    global _client
    if _client is None:
        q_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        _client = QdrantClient(url=q_url)
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

def search(
    vector: list[float],
    limit: int = 5,
    client_id: int | None = None,
    project_id: int | None = None,
    allowed_projects: list[int] | None = None,
) -> list[dict]:
    client = get_client()
    conditions = []

    # 1. STRICT FILTER: Agar project select hai toh sirf wahi search karo
    if project_id:
        conditions.append(FieldCondition(key="project_id", match=MatchValue(value=project_id)))
    elif client_id:
        conditions.append(FieldCondition(key="client_id", match=MatchValue(value=client_id)))

    # 2. SECURITY: User sirf apne allowed projects dekh sake
    if allowed_projects is not None:
        conditions.append(FieldCondition(key="project_id", match=MatchAny(any=allowed_projects)))

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
            "filename": r.payload.get("filename") or r.payload.get("title"),
            "score": r.score,
            "speaker_name": r.payload.get("speaker_name")
        }
        for r in results
    ]