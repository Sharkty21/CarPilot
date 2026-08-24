"""Chunk + embed redacted text into pgvector."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langsmith import traceable

from clients.db import get_pool
from config import get_settings

logger = logging.getLogger(__name__)


@traceable(name="embed_and_store", run_type="embedding")
async def embed_and_store(
    *,
    redacted_text: str,
    vehicle_id: str,
    user_id: str,
    filename: str,
    content_type: str | None,
    bucket_key: str,
    document_date: datetime | None = None,
    extra_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Chunk redacted text, embed, and persist to ai_document_registry / ai_document_chunks.

    Callers MUST pass already-redacted text. This function never redacts.
    """
    if not redacted_text or not redacted_text.strip():
        raise ValueError("Cannot embed empty redacted text")

    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_text(redacted_text)
    if not chunks:
        raise ValueError("Text splitter produced no chunks")

    embeddings = OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        api_key=settings.openai_api_key or None,
    )
    vectors = embeddings.embed_documents(chunks)

    document_id = uuid.uuid4()
    created_at = datetime.now(timezone.utc)
    pool = get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO ai_document_registry (
                    id, vehicle_id, user_id, filename, content_type,
                    bucket_key, document_date, chunk_count, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                document_id,
                vehicle_id,
                user_id,
                filename,
                content_type,
                bucket_key,
                document_date,
                len(chunks),
                created_at,
            )

            for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
                metadata = {
                    "filename": filename,
                    "bucket_key": bucket_key,
                    "chunk_index": index,
                    **(extra_metadata or {}),
                }
                embedding_literal = "[" + ",".join(str(x) for x in vector) + "]"
                await conn.execute(
                    """
                    INSERT INTO ai_document_chunks (
                        id, document_id, vehicle_id, chunk_index,
                        content, embedding, metadata, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8)
                    """,
                    uuid.uuid4(),
                    document_id,
                    vehicle_id,
                    index,
                    chunk,
                    embedding_literal,
                    json.dumps(metadata),
                    created_at,
                )

    logger.info(
        "Stored embeddings for document",
        extra={
            "document_id": str(document_id),
            "vehicle_id": vehicle_id,
            "chunk_count": len(chunks),
            "filename": filename,
        },
    )
    return {
        "document_id": str(document_id),
        "vehicle_id": vehicle_id,
        "filename": filename,
        "bucket_key": bucket_key,
        "chunk_count": len(chunks),
        "created_at": created_at.isoformat(),
    }
