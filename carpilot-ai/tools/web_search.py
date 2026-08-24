"""Open-web research tool for general automotive knowledge."""

from __future__ import annotations

import json
import logging

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


@tool
def search_web(query: str) -> str:
    """Search the open web for general automotive information.

    Use for recalls, market values, resale / trade-in / fair-market estimates, typical
    service intervals, TSBs, and other public knowledge — NOT for the owner's uploaded
    documents or structured garage records.

    For worth/price questions: required after get_vehicle_info. Do not skip this tool
    just because estimatedValue came back from the garage profile.

    This tool accepts only a search query. It does NOT accept vehicle_id or any
    garage identifier. Call get_vehicle_info first when you need year, make, model,
    trim, or mileage, then put those details into the query string.

    Example queries:
    - "2021 Honda Civic EX private party value 45000 miles"
    - "2020 Toyota RAV4 XLE trade-in value 62000 miles"
    - "2019 Toyota Camry brake recall"

    Args:
        query: Natural-language search query for a web search engine.
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
