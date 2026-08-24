"""Document ingestion pipeline: store original → extract → redact → embed."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from langsmith import traceable

from clients import storage
from ingestion.embed import embed_and_store
from ingestion.extract import extract_text
from ingestion.redact import redact_text

logger = logging.getLogger(__name__)


@traceable(name="ingest_document", run_type="chain")
async def ingest_document(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    vehicle_id: str,
    user_id: str,
) -> dict:
    """Run the full ingestion pipeline with a fail-closed redaction gate.

    Order is fixed:
      upload original → extract → redact → chunk/embed redacted text only
    """
    doc_id = uuid.uuid4()
    bucket_key = f"vehicles/{vehicle_id}/originals/{doc_id}/{filename}"

    # 1. Store the original unredacted file in the private bucket.
    storage.upload_bytes(
        key=bucket_key,
        body=content,
        content_type=content_type,
    )

    # 2. Extract raw text.
    try:
        raw_text = extract_text(filename, content, content_type)
    except Exception:
        logger.exception("Extraction failed; aborting ingestion (no embeddings written)")
        raise

    # 3. Redact — gate. Nothing downstream may see unredacted text.
    try:
        redaction = redact_text(raw_text)
    except Exception:
        logger.exception("Redaction failed; aborting ingestion (fail closed)")
        raise

    # Drop reference to raw text as soon as redaction succeeds.
    del raw_text

    # 4. Embed only redacted text.
    result = await embed_and_store(
        redacted_text=redaction.redacted_text,
        vehicle_id=vehicle_id,
        user_id=user_id,
        filename=filename,
        content_type=content_type,
        bucket_key=bucket_key,
        document_date=datetime.now(timezone.utc),
        extra_metadata={
            "redaction_entity_types": redaction.entity_types_found,
            "redaction_entity_counts": redaction.entity_counts,
        },
    )
    result["redaction"] = {
        "entity_types_found": redaction.entity_types_found,
        "entity_counts": redaction.entity_counts,
    }
    return result
