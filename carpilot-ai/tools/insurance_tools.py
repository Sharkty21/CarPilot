"""Insurance info tools — reads/writes go through the .NET API."""

from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.tools import tool

from clients.api_client import get_api_client

logger = logging.getLogger(__name__)


@tool
async def get_insurance_info(vehicle_id: str) -> str:
    """Fetch the structured insurance information for a vehicle from the CarPilot API.

    Use when the user asks about their insurer, policy number, deductible,
    premium, coverage type, or renewal dates stored in the garage (not uploaded PDFs).

    Args:
        vehicle_id: Target vehicle id.
    """
    try:
        vehicle = await get_api_client().get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."
        return json.dumps(vehicle.get("insurance") or {}, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("get_insurance_info failed")
        return f"Error fetching insurance info: {exc}"


@tool
async def update_insurance_info(
    vehicle_id: str,
    insurer: Optional[str] = None,
    policy_number: Optional[str] = None,
    coverage_type: Optional[str] = None,
    monthly_premium: Optional[float] = None,
    deductible: Optional[float] = None,
    effective_date: Optional[str] = None,
    renewal_date: Optional[str] = None,
    agent_name: Optional[str] = None,
    agent_phone: Optional[str] = None,
) -> str:
    """Replace the vehicle's insurance fields via the CarPilot API.

    IMPORTANT: Before calling this tool, confirm with the user in natural language
    that they want to overwrite their insurance information. Do not call until they agree.
    The API replaces the insurance section; omit fields only when the user wants them cleared.

    Args:
        vehicle_id: Target vehicle id.
        insurer: Insurance company name.
        policy_number: Policy number.
        coverage_type: Coverage description (e.g. Full coverage).
        monthly_premium: Monthly premium amount.
        deductible: Deductible amount.
        effective_date: ISO-8601 effective date.
        renewal_date: ISO-8601 renewal date.
        agent_name: Agent contact name.
        agent_phone: Agent phone number.
    """
    try:
        client = get_api_client()
        vehicle = await client.get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."

        current = vehicle.get("insurance") or {}
        payload = {
            "insurer": insurer if insurer is not None else current.get("insurer"),
            "policyNumber": policy_number
            if policy_number is not None
            else current.get("policyNumber"),
            "coverageType": coverage_type
            if coverage_type is not None
            else current.get("coverageType"),
            "monthlyPremium": monthly_premium
            if monthly_premium is not None
            else current.get("monthlyPremium"),
            "deductible": deductible if deductible is not None else current.get("deductible"),
            "effectiveDate": effective_date
            if effective_date is not None
            else current.get("effectiveDate"),
            "renewalDate": renewal_date
            if renewal_date is not None
            else current.get("renewalDate"),
            "agentName": agent_name if agent_name is not None else current.get("agentName"),
            "agentPhone": agent_phone if agent_phone is not None else current.get("agentPhone"),
        }
        updated = await client.update_insurance(vehicle_id, payload)
        return json.dumps(updated.get("insurance") or payload, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("update_insurance_info failed")
        return f"Error updating insurance info: {exc}"
