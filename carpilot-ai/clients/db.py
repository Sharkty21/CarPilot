"""asyncpg pool and vector-document schema helpers.

Uses ai_* table names so the Python RAG store does not collide with the
.NET EF `document_chunks` table (different embedding dimensions).
"""

from __future__ import annotations

import json
import logging
from typing import Any

import asyncpg

from config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_document_registry (
    id UUID PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT,
    bucket_key TEXT NOT NULL,
    document_date TIMESTAMPTZ,
    chunk_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_document_registry_vehicle
    ON ai_document_registry (vehicle_id);

CREATE TABLE IF NOT EXISTS ai_document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES ai_document_registry(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_vehicle
    ON ai_document_chunks (vehicle_id);
"""


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool

    settings = get_settings()
    _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=10)
    async with _pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
        try:
            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding
                ON ai_document_chunks
                USING hnsw (embedding vector_cosine_ops);
                """
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not create HNSW index yet: %s", exc)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call init_pool() on startup.")
    return _pool


async def similarity_search(
    *,
    vehicle_id: str,
    query_embedding: list[float],
    top_k: int,
) -> list[dict[str, Any]]:
    pool = get_pool()
    embedding_literal = "[" + ",".join(str(x) for x in query_embedding) + "]"
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                c.content,
                c.metadata,
                c.chunk_index,
                d.filename,
                d.bucket_key,
                d.document_date,
                1 - (c.embedding <=> $1::vector) AS score
            FROM ai_document_chunks c
            JOIN ai_document_registry d ON d.id = c.document_id
            WHERE c.vehicle_id = $2
              AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> $1::vector
            LIMIT $3
            """,
            embedding_literal,
            vehicle_id,
            top_k,
        )

    results: list[dict[str, Any]] = []
    for row in rows:
        metadata = row["metadata"]
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        results.append(
            {
                "content": row["content"],
                "score": float(row["score"]) if row["score"] is not None else None,
                "chunk_index": row["chunk_index"],
                "filename": row["filename"],
                "bucket_key": row["bucket_key"],
                "document_date": row["document_date"].isoformat()
                if row["document_date"]
                else None,
                "metadata": metadata or {},
            }
        )
    return results


async def list_documents(vehicle_id: str) -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, vehicle_id, user_id, filename, content_type, bucket_key,
                   document_date, chunk_count, created_at
            FROM ai_document_registry
            WHERE vehicle_id = $1
            ORDER BY created_at DESC
            """,
            vehicle_id,
        )
    return [
        {
            "id": str(row["id"]),
            "vehicle_id": row["vehicle_id"],
            "user_id": row["user_id"],
            "filename": row["filename"],
            "content_type": row["content_type"],
            "bucket_key": row["bucket_key"],
            "document_date": row["document_date"].isoformat()
            if row["document_date"]
            else None,
            "chunk_count": row["chunk_count"],
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]


async def has_documents(vehicle_id: str) -> bool:
    pool = get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM ai_document_registry WHERE vehicle_id = $1",
            vehicle_id,
        )
    return bool(count)
