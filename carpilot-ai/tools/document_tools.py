"""Attach chat-uploaded documents to a garage section via the .NET API."""

from __future__ import annotations

import json
import logging
from typing import Annotated, Literal

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from agent.state import AgentState
from clients.api_client import get_api_client

logger = logging.getLogger(__name__)

DocumentSection = Literal["insurance", "warranty", "finance"]


@tool
async def attach_document(
    staging_id: str,
    section: DocumentSection,
    state: Annotated[AgentState, InjectedState],
) -> str:
    """File a document the user just attached in chat onto a vehicle section.

    Use after reading the extracted text in this turn. Attach only when the
    document clearly belongs on the vehicle:
    - insurance: policy, declarations page, insurance ID card
    - warranty: extended warranty or vehicle service contract
    - finance: loan, retail installment contract, or lease agreement

    staging_id is the id provided with the attachment in the user message.
    Do not attach unrelated files (photos, random PDFs, service invoices).
    Service invoices should become a maintenance record instead.

    The current vehicle is selected automatically — do not pass a vehicle id.
    """
    vehicle_id = state["vehicle_id"]
    try:
        updated = await get_api_client().commit_staged_document(
            vehicle_id, section, staging_id
        )
        docs = []
        if section == "insurance":
            docs = (updated.get("insurance") or {}).get("documents") or []
        elif section == "warranty":
            docs = (updated.get("warranty") or {}).get("documents") or []
        elif section == "finance":
            docs = (updated.get("finance") or {}).get("documents") or []
        names = [d.get("name") for d in docs if isinstance(d, dict)]
        return json.dumps(
            {
                "attached": True,
                "section": section,
                "stagingId": staging_id,
                "documentNames": names[:8],
            },
            ensure_ascii=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("attach_document failed")
        return f"Error attaching document: {exc}"
