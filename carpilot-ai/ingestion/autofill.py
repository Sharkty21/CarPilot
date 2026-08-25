"""Structured field extraction from uploaded vehicle documents."""

from __future__ import annotations

import base64
import json
import logging
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field

from config import get_settings
from ingestion.extract import extract_text

logger = logging.getLogger(__name__)

AutofillSection = Literal["insurance", "warranty", "finance", "maintenance"]

_MAX_TEXT_CHARS = 12_000


class InsuranceFields(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    insurer: str | None = None
    policy_number: str | None = Field(default=None, alias="policyNumber")
    coverage_type: str | None = Field(default=None, alias="coverageType")
    monthly_premium: float | None = Field(default=None, alias="monthlyPremium")
    deductible: float | None = None
    effective_date: str | None = Field(default=None, alias="effectiveDate")
    renewal_date: str | None = Field(default=None, alias="renewalDate")
    agent_name: str | None = Field(default=None, alias="agentName")
    agent_phone: str | None = Field(default=None, alias="agentPhone")


class WarrantyFields(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    provider: str | None = None
    plan_name: str | None = Field(default=None, alias="planName")
    contract_number: str | None = Field(default=None, alias="contractNumber")
    coverage_level: str | None = Field(default=None, alias="coverageLevel")
    start_date: str | None = Field(default=None, alias="startDate")
    start_mileage: int | None = Field(default=None, alias="startMileage")
    expiration_date: str | None = Field(default=None, alias="expirationDate")
    expiration_mileage: int | None = Field(default=None, alias="expirationMileage")
    deductible: float | None = None
    price_paid: float | None = Field(default=None, alias="pricePaid")
    transferable: bool | None = None
    notes: str | None = None


class FinanceFields(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    kind: str | None = None
    lender: str | None = None
    start_date: str | None = Field(default=None, alias="startDate")
    term_months: int | None = Field(default=None, alias="termMonths")
    monthly_payment: float | None = Field(default=None, alias="monthlyPayment")
    apr: float | None = None
    amount_financed: float | None = Field(default=None, alias="amountFinanced")
    down_payment: float | None = Field(default=None, alias="downPayment")
    payoff_amount: float | None = Field(default=None, alias="payoffAmount")
    residual_value: float | None = Field(default=None, alias="residualValue")
    annual_mileage_allowance: int | None = Field(
        default=None, alias="annualMileageAllowance"
    )


class MaintenanceFields(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    type: str | None = None
    description: str | None = None
    date: str | None = None
    cost: float | None = None
    mileage: int | None = None
    shop: str | None = None


SECTION_MODELS: dict[str, type[BaseModel]] = {
    "insurance": InsuranceFields,
    "warranty": WarrantyFields,
    "finance": FinanceFields,
    "maintenance": MaintenanceFields,
}

_SECTION_HINTS = {
    "insurance": (
        "This is an auto insurance declarations page, ID card, or policy. "
        "Dates must be YYYY-MM-DD."
    ),
    "warranty": (
        "This is an extended warranty or vehicle service contract. "
        "coverageLevel must be one of: Powertrain, Bumper-to-bumper, "
        "Exclusionary, Wrap, Component, Other. Dates must be YYYY-MM-DD."
    ),
    "finance": (
        "This is a retail installment contract, loan, or lease agreement. "
        "kind must be Financing, Leasing, or Owned. Dates must be YYYY-MM-DD. "
        "apr is a percent (e.g. 3.24 not 0.0324)."
    ),
    "maintenance": (
        "This is a service invoice or repair receipt. "
        "type must be Repair, Maintenance, or Product. Dates must be YYYY-MM-DD."
    ),
}


def is_image(filename: str, content_type: str | None) -> bool:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()
    return ctype.startswith("image/") or name.endswith(
        (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".heic", ".gif")
    )


def _llm() -> ChatOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0,
    )


def _data_url(content: bytes, content_type: str | None) -> str:
    mime = content_type if content_type and "/" in content_type else "image/jpeg"
    b64 = base64.b64encode(content).decode("ascii")
    return f"data:{mime};base64,{b64}"


async def read_document_text(
    *,
    filename: str,
    content: bytes,
    content_type: str | None,
) -> str:
    """Return readable text from a PDF, image, or text file for the agent."""
    if is_image(filename, content_type):
        return await _vision_transcribe(filename, content, content_type)

    try:
        text = extract_text(filename, content, content_type)
    except Exception:
        logger.exception("Text extraction failed for %s", filename)
        # Last resort: try vision in case a scanned PDF was mislabeled as an image-like blob.
        if (content_type or "").lower().startswith("image/"):
            return await _vision_transcribe(filename, content, content_type)
        raise

    return text[:_MAX_TEXT_CHARS]


async def extract_section_fields(
    *,
    section: str,
    filename: str,
    content: bytes,
    content_type: str | None,
) -> dict[str, Any]:
    """Return camelCase fields found in the document for the given garage section."""
    key = section.strip().lower()
    model_cls = SECTION_MODELS.get(key)
    if model_cls is None:
        raise ValueError(f"Unsupported autofill section '{section}'")

    if is_image(filename, content_type):
        parsed = await _structured_from_image(
            model_cls, key, filename, content, content_type
        )
    else:
        text = await read_document_text(
            filename=filename, content=content, content_type=content_type
        )
        parsed = await _structured_from_text(model_cls, key, filename, text)

    return parsed.model_dump(by_alias=True, exclude_none=True)


async def _vision_transcribe(filename: str, content: bytes, content_type: str | None) -> str:
    llm = _llm()
    result = await llm.ainvoke(
        [
            SystemMessage(
                content=(
                    "Transcribe every readable field from this vehicle document. "
                    "Preserve numbers, dates, names, and policy/contract identifiers. "
                    "If it is a photo of an insurance card, loan paper, warranty, or "
                    "service invoice, prefer a structured list of label: value lines. "
                    "If nothing is readable, say so briefly."
                )
            ),
            HumanMessage(
                content=[
                    {"type": "text", "text": f"Document filename: {filename}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": _data_url(content, content_type)},
                    },
                ]
            ),
        ]
    )
    text = result.content if isinstance(result.content, str) else str(result.content)
    return text[:_MAX_TEXT_CHARS]


async def _structured_from_text(
    model_cls: type[BaseModel],
    section: str,
    filename: str,
    text: str,
) -> BaseModel:
    llm = _llm().with_structured_output(model_cls)
    return await llm.ainvoke(
        [
            SystemMessage(content=_structured_system_prompt(section)),
            HumanMessage(
                content=(
                    f"Filename: {filename}\n\nDocument text:\n{text[:_MAX_TEXT_CHARS]}"
                )
            ),
        ]
    )


async def _structured_from_image(
    model_cls: type[BaseModel],
    section: str,
    filename: str,
    content: bytes,
    content_type: str | None,
) -> BaseModel:
    llm = _llm().with_structured_output(model_cls)
    return await llm.ainvoke(
        [
            SystemMessage(content=_structured_system_prompt(section)),
            HumanMessage(
                content=[
                    {"type": "text", "text": f"Filename: {filename}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": _data_url(content, content_type)},
                    },
                ]
            ),
        ]
    )


def _structured_system_prompt(section: str) -> str:
    hint = _SECTION_HINTS[section]
    return (
        "Extract only values that are clearly present in the document. "
        "Omit a field rather than guessing. "
        f"{hint}"
    )


def fields_json(fields: dict[str, Any]) -> str:
    return json.dumps(fields, ensure_ascii=True)
