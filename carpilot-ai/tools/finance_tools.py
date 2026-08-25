"""Finance / lease info tools — reads/writes go through the .NET API."""

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
async def get_finance_info(state: Annotated[AgentState, InjectedState]) -> str:
    """Fetch the structured loan, lease, or ownership information for the current vehicle.

    Use when the user asks about their lender, payment, APR, term, residual,
    or payoff stored in the garage (not uploaded PDFs).

    The current vehicle is selected automatically — do not pass a vehicle id.
    """
    vehicle_id = state["vehicle_id"]
    try:
        vehicle = await get_api_client().get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."
        return json.dumps(vehicle.get("finance") or {}, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("get_finance_info failed")
        return f"Error fetching finance info: {exc}"


@tool
async def update_finance_info(
    state: Annotated[AgentState, InjectedState],
    kind: Optional[str] = None,
    lender: Optional[str] = None,
    start_date: Optional[str] = None,
    term_months: Optional[int] = None,
    monthly_payment: Optional[float] = None,
    apr: Optional[float] = None,
    amount_financed: Optional[float] = None,
    down_payment: Optional[float] = None,
    payoff_amount: Optional[float] = None,
    residual_value: Optional[float] = None,
    annual_mileage_allowance: Optional[int] = None,
) -> str:
    """Update the current vehicle's finance fields via the CarPilot API.

    When the user attached a loan or lease document in this turn, call this
    without asking first — attaching the paperwork is consent to save those fields.
    Otherwise, confirm in natural language before overwriting existing finance details.

    Omit any field you did not extract; existing garage values for omitted fields
    are kept. kind must be Financing, Leasing, or Owned.

    The current vehicle is selected automatically — do not pass a vehicle id.
    """
    vehicle_id = state["vehicle_id"]
    try:
        client = get_api_client()
        vehicle = await client.get_vehicle(vehicle_id)
        if vehicle is None:
            return f"Vehicle {vehicle_id} was not found."

        current = vehicle.get("finance") or {}
        payload = {
            "kind": kind if kind is not None else current.get("kind") or "Owned",
            "lender": lender if lender is not None else current.get("lender"),
            "startDate": start_date if start_date is not None else current.get("startDate"),
            "termMonths": term_months
            if term_months is not None
            else current.get("termMonths"),
            "monthlyPayment": monthly_payment
            if monthly_payment is not None
            else current.get("monthlyPayment"),
            "apr": apr if apr is not None else current.get("apr"),
            "amountFinanced": amount_financed
            if amount_financed is not None
            else current.get("amountFinanced"),
            "downPayment": down_payment
            if down_payment is not None
            else current.get("downPayment"),
            "payoffAmount": payoff_amount
            if payoff_amount is not None
            else current.get("payoffAmount"),
            "residualValue": residual_value
            if residual_value is not None
            else current.get("residualValue"),
            "annualMileageAllowance": annual_mileage_allowance
            if annual_mileage_allowance is not None
            else current.get("annualMileageAllowance"),
        }
        updated = await client.update_finance(vehicle_id, payload)
        return json.dumps(updated.get("finance") or payload, ensure_ascii=True)
    except Exception as exc:  # noqa: BLE001
        logger.exception("update_finance_info failed")
        return f"Error updating finance info: {exc}"
