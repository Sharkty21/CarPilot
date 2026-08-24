"""Seed demo vehicle documents into the AI vector store on startup."""

from __future__ import annotations

import logging
from pathlib import Path

from clients.db import has_documents
from ingestion.pipeline import ingest_document

logger = logging.getLogger(__name__)

DEMO_USER_ID = "a0000000-0000-4000-8000-000000000001"
DEMO_VEHICLE_ID = "veh-1"

SEED_DIR = Path(__file__).resolve().parent / "seed-docs"

# (filename, content_type) — names must match GarageSeedData document metadata.
SEED_FILES: list[tuple[str, str]] = [
    ("Policy-Declarations-2026.txt", "text/plain"),
    ("Service-Contract-EVP-2214.txt", "text/plain"),
    ("Covered-Components-Schedule.txt", "text/plain"),
    ("Oil-Change-Invoice-71204.txt", "text/plain"),
    ("Brake-Invoice.txt", "text/plain"),
]


async def seed_demo_documents() -> None:
    """Ingest seed text files for the demo RAV4 when the AI index is empty."""
    if not SEED_DIR.is_dir():
        logger.warning("Seed docs directory missing: %s", SEED_DIR)
        return

    if await has_documents(DEMO_VEHICLE_ID):
        logger.info("AI document index already has content for %s; skipping seed", DEMO_VEHICLE_ID)
        return

    if not SEED_DIR.joinpath(SEED_FILES[0][0]).is_file():
        logger.warning("Seed doc files not found under %s", SEED_DIR)
        return

    for filename, content_type in SEED_FILES:
        path = SEED_DIR / filename
        if not path.is_file():
            logger.warning("Missing seed file %s", path)
            continue
        try:
            content = path.read_bytes()
            result = await ingest_document(
                content=content,
                filename=filename,
                content_type=content_type,
                vehicle_id=DEMO_VEHICLE_ID,
                user_id=DEMO_USER_ID,
            )
            logger.info(
                "Seeded AI document %s (%s chunks)",
                filename,
                result.get("chunk_count"),
            )
        except Exception:  # noqa: BLE001
            logger.exception("Failed to seed document %s", filename)
