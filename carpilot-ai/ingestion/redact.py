"""Presidio-based PII redaction — gate before any embedding or RAG storage."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Iterable

from langsmith import traceable
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logger = logging.getLogger(__name__)

# Core PII entity types required by the CarPilot spec.
TARGET_ENTITIES = [
    "PERSON",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "LOCATION",
    "US_SSN",
    "US_DRIVER_LICENSE",
    "NRP",  # nationality / religious / political group — often on IDs
]

# Domain-specific supplements (do not replace Presidio for names/addresses/etc.).
VIN_PATTERN = re.compile(
    r"\b([A-HJ-NPR-Z0-9]{17})\b",
    re.IGNORECASE,
)
POLICY_NUMBER_PATTERN = re.compile(
    r"\b(?:policy|pol\.?)\s*(?:#|no\.?|number)?\s*[:#]?\s*([A-Z0-9-]{6,})\b",
    re.IGNORECASE,
)
SSN_PATTERN = re.compile(r"\b(\d{3}-\d{2}-\d{4})\b")
STREET_ADDRESS_PATTERN = re.compile(
    r"\b\d{1,5}\s+[A-Za-z0-9.'\-]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|"
    r"Lane|Ln|Drive|Dr|Court|Ct|Terrace|Ter|Way|Place|Pl)\.?\b",
    re.IGNORECASE,
)


@dataclass
class RedactionResult:
    redacted_text: str
    entity_counts: dict[str, int] = field(default_factory=dict)
    entity_types_found: list[str] = field(default_factory=list)


@lru_cache
def _analyzer() -> AnalyzerEngine:
    analyzer = AnalyzerEngine()

    vin_recognizer = PatternRecognizer(
        supported_entity="VEHICLE_VIN",
        patterns=[Pattern(name="vin", regex=VIN_PATTERN.pattern, score=0.6)],
    )
    policy_recognizer = PatternRecognizer(
        supported_entity="POLICY_NUMBER",
        patterns=[
            Pattern(name="policy", regex=POLICY_NUMBER_PATTERN.pattern, score=0.4)
        ],
    )
    # Supplement Presidio's built-in SSN recognizer for labeled invoice formats.
    ssn_recognizer = PatternRecognizer(
        supported_entity="US_SSN",
        patterns=[Pattern(name="ssn_dashed", regex=SSN_PATTERN.pattern, score=0.6)],
        context=["ssn", "social", "security"],
    )
    # Supplement LOCATION for US street lines Presidio often misses.
    street_recognizer = PatternRecognizer(
        supported_entity="LOCATION",
        patterns=[
            Pattern(name="us_street", regex=STREET_ADDRESS_PATTERN.pattern, score=0.55)
        ],
    )
    analyzer.registry.add_recognizer(vin_recognizer)
    analyzer.registry.add_recognizer(policy_recognizer)
    analyzer.registry.add_recognizer(ssn_recognizer)
    analyzer.registry.add_recognizer(street_recognizer)
    return analyzer


@lru_cache
def _anonymizer() -> AnonymizerEngine:
    return AnonymizerEngine()


def _count_entities(results: Iterable[RecognizerResult]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for result in results:
        counts[result.entity_type] = counts.get(result.entity_type, 0) + 1
    return counts


@traceable(name="redact_pii", run_type="tool")
def redact_text(text: str, language: str = "en") -> RedactionResult:
    """Detect PII with Presidio and replace with typed placeholders.

    Fail closed: if analysis or anonymization raises, the caller must not
    continue to embedding. This function re-raises after logging metadata-safe info.
    """
    if not text or not text.strip():
        return RedactionResult(redacted_text=text, entity_counts={}, entity_types_found=[])

    try:
        entities = TARGET_ENTITIES + ["VEHICLE_VIN", "POLICY_NUMBER"]
        analyzer_results = _analyzer().analyze(
            text=text,
            language=language,
            entities=entities,
        )
        entity_counts = _count_entities(analyzer_results)
        entity_types = sorted(entity_counts.keys())

        # Log counts only — never entity values.
        logger.info(
            "Redaction pass complete",
            extra={
                "entity_types_found": entity_types,
                "entity_counts": entity_counts,
                "entity_total": sum(entity_counts.values()),
            },
        )

        operators = {
            entity: OperatorConfig(
                "replace",
                {"new_value": f"<{entity}>"},
            )
            for entity in set(entity_counts) | set(TARGET_ENTITIES)
        }

        anonymized = _anonymizer().anonymize(
            text=text,
            analyzer_results=analyzer_results,
            operators=operators,
        )

        return RedactionResult(
            redacted_text=anonymized.text,
            entity_counts=entity_counts,
            entity_types_found=entity_types,
        )
    except Exception:
        logger.exception(
            "Redaction failed — refusing to pass unredacted text downstream"
        )
        raise
