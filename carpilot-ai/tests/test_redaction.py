"""Unit tests for Presidio PII redaction."""

from __future__ import annotations

import pytest

from ingestion.redact import redact_text


SAMPLE_DOCUMENT = """
Service Invoice
Customer: Jane Q. Public
Phone: (555) 123-4567
Email: jane.public@example.com
Address: 742 Evergreen Terrace, Springfield, IL 62704
SSN: 078-05-1120
Driver License: D1234567
VIN: 1HGCM82633A004352
Policy Number: POL-998877
Work performed by Mike's Auto on 2024-03-12: oil change, $89.00
"""


@pytest.fixture(scope="module")
def redaction():
    # spaCy model must be installed (en_core_web_sm).
    return redact_text(SAMPLE_DOCUMENT)


def test_redacts_person_name(redaction):
    assert "Jane Q. Public" not in redaction.redacted_text
    assert "<PERSON>" in redaction.redacted_text or "PERSON" in redaction.entity_types_found


def test_redacts_phone(redaction):
    assert "(555) 123-4567" not in redaction.redacted_text
    assert (
        "<PHONE_NUMBER>" in redaction.redacted_text
        or "PHONE_NUMBER" in redaction.entity_types_found
    )


def test_redacts_email(redaction):
    assert "jane.public@example.com" not in redaction.redacted_text
    assert (
        "<EMAIL_ADDRESS>" in redaction.redacted_text
        or "EMAIL_ADDRESS" in redaction.entity_types_found
    )


def test_redacts_address_or_location(redaction):
    assert "742 Evergreen Terrace" not in redaction.redacted_text
    assert "LOCATION" in redaction.entity_types_found
    assert "<LOCATION>" in redaction.redacted_text


def test_redacts_ssn(redaction):
    assert "078-05-1120" not in redaction.redacted_text
    assert "<US_SSN>" in redaction.redacted_text
    assert "US_SSN" in redaction.entity_types_found


def test_entity_counts_do_not_include_values(redaction):
    # Metadata must be counts/types only.
    assert isinstance(redaction.entity_counts, dict)
    for key, value in redaction.entity_counts.items():
        assert isinstance(key, str)
        assert isinstance(value, int)
        assert "Jane" not in key
        assert "555" not in key


def test_preserves_non_pii_service_context(redaction):
    assert "oil change" in redaction.redacted_text.lower()
