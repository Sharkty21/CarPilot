"""Warranty info tools — reads/writes go through the .NET API."""

from __future__ import annotations

import json
import logging
from typing import Annotated, Optional

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from agent.state import AgentState
from clients.api_client import get_api_client

logger = logging.getLogger(__name__)


@tool
async def get_warranty_info(state: Annotated[AgentState, InjectedState]) -> str:
    """Fetch the structured warranty / service-contract information for the current vehicle.

    Use when the user asks about coverage level, deductible, expiration, provider,
    or transferability stored in the garage (not uploaded PDFs).

    The current vehicle is selected automatically — do not pass a vehicle id.
    """
    vehicle_id = state["vehicle_id"]
    try:
        vehicle = await get_api_client().get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."
        return json.dumps(vehicle.get("warranty") or {}, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("get_warranty_info failed")
        return f"Error fetching warranty info: {exc}"


@tool
async def update_warranty_info(
    state: Annotated[AgentState, InjectedState],
    provider: Optional[str] = None,
    plan_name: Optional[str] = None,
    contract_number: Optional[str] = None,
    coverage_level: Optional[str] = None,
    start_date: Optional[str] = None,
    start_mileage: Optional[int] = None,
    expiration_date: Optional[str] = None,
    expiration_mileage: Optional[int] = None,
    deductible: Optional[float] = None,
    price_paid: Optional[float] = None,
    transferable: Optional[bool] = None,
    notes: Optional[str] = None,
) -> str:
    """Replace the current vehicle's warranty fields via the CarPilot API.

    IMPORTANT: Before calling this tool, confirm with the user in natural language
    that they want to overwrite their warranty information. Do not call until they agree.

    The current vehicle is selected automatically — do not pass a vehicle id.

    Args:
        provider: Warranty provider name.
        plan_name: Plan or product name.
        contract_number: Contract / policy number.
        coverage_level: e.g. Powertrain, Bumper-to-bumper, Exclusionary.
        start_date: ISO-8601 start date.
        start_mileage: Odometer when coverage began.
        expiration_date: ISO-8601 end date.
        expiration_mileage: Mileage limit.
        deductible: Claim deductible.
        price_paid: Amount paid for the contract.
        transferable: Whether the warranty can transfer to a buyer.
        notes: Free-form notes.
    """
    vehicle_id = state["vehicle_id"]
    try:
        client = get_api_client()
        vehicle = await client.get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."

        current = vehicle.get("warranty") or {}
        payload = {
            "provider": provider if provider is not None else current.get("provider"),
            "planName": plan_name if plan_name is not None else current.get("planName"),
            "contractNumber": contract_number
            if contract_number is not None
            else current.get("contractNumber"),
            "coverageLevel": coverage_level
            if coverage_level is not None
            else current.get("coverageLevel"),
            "startDate": start_date if start_date is not None else current.get("startDate"),
            "startMileage": start_mileage
            if start_mileage is not None
            else current.get("startMileage"),
            "expirationDate": expiration_date
            if expiration_date is not None
            else current.get("expirationDate"),
            "expirationMileage": expiration_mileage
            if expiration_mileage is not None
            else current.get("expirationMileage"),
            "deductible": deductible if deductible is not None else current.get("deductible"),
            "pricePaid": price_paid if price_paid is not None else current.get("pricePaid"),
            "transferable": transferable
            if transferable is not None
            else current.get("transferable"),
            "notes": notes if notes is not None else current.get("notes"),
        }
        updated = await client.update_warranty(vehicle_id, payload)
        return json.dumps(updated.get("warranty") or payload, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("update_warranty_info failed")
        return f"Error updating warranty info: {exc}"
