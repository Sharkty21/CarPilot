"""Autofill schema contracts — no LLM calls."""

from __future__ import annotations

from ingestion.autofill import SECTION_MODELS, is_image


def test_supported_sections():
    assert set(SECTION_MODELS) == {"insurance", "warranty", "finance", "maintenance"}


def test_insurance_aliases_are_camel_case():
    dumped = SECTION_MODELS["insurance"](policy_number="X").model_dump(by_alias=True)
    assert "policyNumber" in dumped
    assert dumped["policyNumber"] == "X"


def test_finance_kind_optional():
    dumped = SECTION_MODELS["finance"]().model_dump(by_alias=True, exclude_none=True)
    assert dumped == {}


def test_is_image_detects_common_types():
    assert is_image("card.jpg", "image/jpeg")
    assert is_image("scan.PNG", None)
    assert not is_image("policy.pdf", "application/pdf")
