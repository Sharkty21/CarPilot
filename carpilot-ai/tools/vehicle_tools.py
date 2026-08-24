"""Vehicle profile tools — reads from the CarPilot garage API."""

from __future__ import annotations

import json
import logging
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from agent.state import AgentState
from clients.api_client import get_api_client

logger = logging.getLogger(__name__)


@tool
async def get_vehicle_info(state: Annotated[AgentState, InjectedState]) -> str:
    """Fetch year, make, model, trim, mileage, and optional stored estimatedValue.

    Call this before search_web when the user asks about market value, recalls, resale
    estimates, or other public knowledge that depends on vehicle details. The current
    vehicle is selected automatically — do not pass a vehicle id.

    estimatedValue is a previously saved garage figure only — it is NOT a live appraisal.
    For worth / price / trade-in / resale questions you MUST still call search_web with
    year/make/model/trim/mileage and base the answer on web research.

    Returns garage profile fields only; use get_insurance_info or get_warranty_info for
    policy and contract details.
    """
    vehicle_id = state["vehicle_id"]
    try:
        vehicle = await get_api_client().get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."

        profile = {
            "id": vehicle.get("id"),
            "nickname": vehicle.get("nickname"),
            "year": vehicle.get("year"),
            "make": vehicle.get("make"),
            "model": vehicle.get("model"),
            "trim": vehicle.get("trim"),
            "mileage": vehicle.get("mileage"),
            "estimatedValue": vehicle.get("estimatedValue"),
            "vin": vehicle.get("vin"),
        }
        return json.dumps(profile, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("get_vehicle_info failed")
        return f"Error fetching vehicle info: {exc}"
