"""Vector similarity search over redacted document chunks in pgvector."""

from __future__ import annotations

import json
import logging
from typing import Annotated

from langchain_core.tools import tool
from langchain_openai import OpenAIEmbeddings
from langgraph.prebuilt import InjectedState
from langsmith import traceable

from agent.state import AgentState
from clients.db import similarity_search
from config import get_settings

logger = logging.getLogger(__name__)


@traceable(name="embed_query_for_search", run_type="embedding")
def _embed_query(query: str) -> list[float]:
    settings = get_settings()
    embeddings = OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        api_key=settings.openai_api_key or None,
    )
    return embeddings.embed_query(query)


@tool
async def search_maintenance_documents(
    query: str,
    state: Annotated[AgentState, InjectedState],
) -> str:
    """Search the owner's uploaded maintenance, insurance, and warranty documents.

    Use when the user asks about their own records, receipts, service history,
    policy details found in uploaded PDFs, or anything that would appear in their
    garage documents. Returns the top matching redacted text chunks with source
    metadata (filename, document date, bucket key reference).

    The current vehicle is selected automatically — do not pass a vehicle id.

    Args:
        query: Natural-language search query.
    """
    vehicle_id = state["vehicle_id"]
    try:
        settings = get_settings()
        embedding = _embed_query(query)
        hits = await similarity_search(
            vehicle_id=vehicle_id,
            query_embedding=embedding,
            top_k=settings.vector_top_k,
        )
        if not hits:
            return "No matching document chunks found for this vehicle."
        return json.dumps(hits, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("search_maintenance_documents failed")
        return f"Error searching documents: {exc}"
