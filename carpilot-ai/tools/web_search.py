"""Open-web research tool for general automotive knowledge."""

from __future__ import annotations

import json
import logging

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


@tool
def search_web(query: str) -> str:
    """Search the open web for general automotive information.

    Use for recalls, market comparisons, typical service intervals, TSBs, and
    other knowledge that is not specific to the owner's uploaded documents or
    structured garage records.

    Args:
        query: Search query suitable for a web search engine.
    """
    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        if not results:
            return "No web results found."
        simplified = [
            {
                "title": item.get("title"),
                "href": item.get("href"),
                "body": item.get("body"),
            }
            for item in results
        ]
        return json.dumps(simplified, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("search_web failed")
        return f"Error searching the web: {exc}"
