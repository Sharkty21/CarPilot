"""Index-for-RAG skips a second original upload and only embeds redacted text."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from ingestion.pipeline import index_redacted_document, ingest_document


async def test_index_redacted_does_not_store_original_and_embeds_redacted_only():
    redaction = MagicMock()
    redaction.redacted_text = "redacted body"
    redaction.entity_types_found = ["PERSON"]
    redaction.entity_counts = {"PERSON": 1}

    with (
        patch("ingestion.pipeline.extract_text", return_value="Jane's policy 123") as extract,
        patch("ingestion.pipeline.redact_text", return_value=redaction) as redact,
        patch("ingestion.pipeline.embed_and_store", new_callable=AsyncMock) as embed,
        patch("ingestion.pipeline.storage") as storage,
    ):
        embed.return_value = {"document_id": "d1", "chunk_count": 1}
        result = await index_redacted_document(
            content=b"bytes",
            filename="policy.pdf",
            content_type="application/pdf",
            vehicle_id="veh-1",
            user_id="user-1",
            bucket_key="user/veh/doc-policy.pdf",
            garage_document_id="doc-abc",
            section="insurance",
        )

    storage.upload_bytes.assert_not_called()
    extract.assert_called_once()
    redact.assert_called_once_with("Jane's policy 123")
    kwargs = embed.await_args.kwargs
    assert kwargs["redacted_text"] == "redacted body"
    assert kwargs["bucket_key"] == "user/veh/doc-policy.pdf"
    assert kwargs["extra_metadata"]["garage_document_id"] == "doc-abc"
    assert kwargs["extra_metadata"]["section"] == "insurance"
    assert result["redaction"]["entity_types_found"] == ["PERSON"]


async def test_ingest_document_stores_original_then_indexes():
    with (
        patch("ingestion.pipeline.storage") as storage,
        patch(
            "ingestion.pipeline.index_redacted_document",
            new_callable=AsyncMock,
            return_value={"document_id": "d1"},
        ) as index,
    ):
        result = await ingest_document(
            content=b"bytes",
            filename="invoice.txt",
            content_type="text/plain",
            vehicle_id="veh-1",
            user_id="user-1",
        )

    storage.upload_bytes.assert_called_once()
    assert "vehicles/veh-1/originals/" in storage.upload_bytes.call_args.kwargs["key"]
    index.assert_awaited_once()
    assert result["document_id"] == "d1"
