"""Document ingestion pipeline: store original → extract → redact → embed."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from langsmith import traceable

from clients import storage
from ingestion.autofill import is_image, read_document_text
from ingestion.embed import embed_and_store
from ingestion.extract import extract_text
from ingestion.redact import redact_text

logger = logging.getLogger(__name__)


async def _extract_for_index(
    *,
    filename: str,
    content: bytes,
    content_type: str | None,
) -> str:
    """Full-document extract. Images use vision; everything else uses extract_text (no char cap)."""
    if is_image(filename, content_type):
        return await read_document_text(
            filename=filename,
            content=content,
            content_type=content_type,
        )
    return extract_text(filename, content, content_type)


@traceable(name="index_redacted_document", run_type="chain")
async def index_redacted_document(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    vehicle_id: str,
    user_id: str,
    bucket_key: str,
    garage_document_id: str | None = None,
    section: str | None = None,
) -> dict[str, Any]:
    """Extract → redact → embed. Does not store the original (caller already did).

    Fail closed: if extract or redaction fails, no embeddings are written.
    """
    try:
        raw_text = await _extract_for_index(
            filename=filename,
            content=content,
            content_type=content_type,
        )
    except Exception:
        logger.exception("Extraction failed; aborting index (no embeddings written)")
        raise

    try:
        redaction = redact_text(raw_text)
    except Exception:
        logger.exception("Redaction failed; aborting index (fail closed)")
        raise

    del raw_text

    extra_metadata: dict[str, Any] = {
        "redaction_entity_types": redaction.entity_types_found,
        "redaction_entity_counts": redaction.entity_counts,
    }
    if garage_document_id:
        extra_metadata["garage_document_id"] = garage_document_id
    if section:
        extra_metadata["section"] = section

    result = await embed_and_store(
        redacted_text=redaction.redacted_text,
        vehicle_id=vehicle_id,
        user_id=user_id,
        filename=filename,
        content_type=content_type,
        bucket_key=bucket_key,
        document_date=datetime.now(timezone.utc),
        extra_metadata=extra_metadata,
    )
    result["redaction"] = {
        "entity_types_found": redaction.entity_types_found,
        "entity_counts": redaction.entity_counts,
    }
    return result


@traceable(name="ingest_document", run_type="chain")
async def ingest_document(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    vehicle_id: str,
    user_id: str,
) -> dict[str, Any]:
    """Full pipeline: upload original, then index redacted text only."""
    doc_id = uuid.uuid4()
    bucket_key = f"vehicles/{vehicle_id}/originals/{doc_id}/{filename}"

    storage.upload_bytes(
        key=bucket_key,
        body=content,
        content_type=content_type,
    )

    return await index_redacted_document(
        content=content,
        filename=filename,
        content_type=content_type,
        vehicle_id=vehicle_id,
        user_id=user_id,
        bucket_key=bucket_key,
    )
