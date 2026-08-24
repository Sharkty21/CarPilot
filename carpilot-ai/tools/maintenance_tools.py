"""Maintenance record CRUD tools — all writes go through the .NET API."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Annotated, Optional

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from agent.state import AgentState
from clients.api_client import get_api_client

logger = logging.getLogger(__name__)


@tool
async def create_maintenance_record(
    type: str,
    state: Annotated[AgentState, InjectedState],
    description: Optional[str] = None,
    date: Optional[str] = None,
    cost: Optional[float] = None,
    mileage: Optional[int] = None,
    shop: Optional[str] = None,
    record_id: Optional[str] = None,
) -> str:
    """Create a new maintenance record for the current vehicle via the CarPilot API.

    Use when the user wants to add a service, repair, or product purchase to their
    garage history. Prefer creating a new record rather than overwriting an
    existing one unless the user clearly intends an update.

    The current vehicle is selected automatically — do not pass a vehicle id.

    Args:
        type: One of "Repair", "Maintenance", or "Product".
        description: What was done or purchased.
        date: ISO-8601 date string (YYYY-MM-DD).
        cost: Amount spent.
        mileage: Odometer reading at the time of service.
        shop: Shop or vendor name.
        record_id: Optional client-owned id; generated if omitted.
    """
    vehicle_id = state["vehicle_id"]
    try:
        rid = record_id or f"maint-{uuid.uuid4()}"
        payload = {
            "id": rid,
            "vehicleId": vehicle_id,
            "type": type,
            "description": description,
            "date": date,
            "cost": cost,
            "mileage": mileage,
            "shop": shop,
            "documents": [],
        }
        saved = await get_api_client().save_maintenance_record(vehicle_id, rid, payload)
        return json.dumps(saved, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("create_maintenance_record failed")
        return f"Error creating maintenance record: {exc}"


@tool
async def update_maintenance_record(
    record_id: str,
    state: Annotated[AgentState, InjectedState],
    type: Optional[str] = None,
    description: Optional[str] = None,
    date: Optional[str] = None,
    cost: Optional[float] = None,
    mileage: Optional[int] = None,
    shop: Optional[str] = None,
) -> str:
    """Update an existing maintenance record by replacing its fields via the CarPilot API.

    IMPORTANT: Before calling this tool, confirm with the user in natural language
    that they want to overwrite the existing record. Do not call until they agree.

    The current vehicle is selected automatically — do not pass a vehicle id.

    Args:
        record_id: Existing maintenance record id.
        type: One of "Repair", "Maintenance", or "Product".
        description: What was done or purchased.
        date: ISO-8601 date string (YYYY-MM-DD).
        cost: Amount spent.
        mileage: Odometer reading at the time of service.
        shop: Shop or vendor name.
    """
    vehicle_id = state["vehicle_id"]
    try:
        client = get_api_client()
        existing_list = await client.get_maintenance_records(vehicle_id)
        existing = next((r for r in existing_list if r.get("id") == record_id), None)
        if existing is None:
            return f"No maintenance record found with id {record_id}."

        payload = {
            "id": record_id,
            "vehicleId": vehicle_id,
            "type": type if type is not None else existing.get("type", "Maintenance"),
            "description": description if description is not None else existing.get("description"),
            "date": date if date is not None else existing.get("date"),
            "cost": cost if cost is not None else existing.get("cost"),
            "mileage": mileage if mileage is not None else existing.get("mileage"),
            "shop": shop if shop is not None else existing.get("shop"),
            "documents": existing.get("documents") or [],
        }
        saved = await client.save_maintenance_record(vehicle_id, record_id, payload)
        return json.dumps(saved, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("update_maintenance_record failed")
        return f"Error updating maintenance record: {exc}"


@tool
async def delete_maintenance_record(
    record_id: str,
    state: Annotated[AgentState, InjectedState],
) -> str:
    """Permanently delete a maintenance record via the CarPilot API.

    IMPORTANT: Before calling this tool, confirm with the user in natural language
    that they want to permanently delete this record. Do not call until they agree.

    The current vehicle is selected automatically — do not pass a vehicle id.

    Args:
        record_id: Maintenance record id to delete.
    """
    vehicle_id = state["vehicle_id"]
    try:
        await get_api_client().delete_maintenance_record(vehicle_id, record_id)
        return f"Deleted maintenance record {record_id}."
    except Exception as exc:  # noqa: BLE001
        logger.exception("delete_maintenance_record failed")
        return f"Error deleting maintenance record: {exc}"


@tool
async def list_maintenance_records(state: Annotated[AgentState, InjectedState]) -> str:
    """List structured maintenance records for the current vehicle from the CarPilot API.

    Prefer this for questions about known garage rows (dates, costs, shops) when
    the user is referring to structured history rather than uploaded PDF text.

    The current vehicle is selected automatically — do not pass a vehicle id.
    """
    vehicle_id = state["vehicle_id"]
    try:
        records = await get_api_client().get_maintenance_records(vehicle_id)
        return json.dumps(records, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("list_maintenance_records failed")
        return f"Error listing maintenance records: {exc}"
