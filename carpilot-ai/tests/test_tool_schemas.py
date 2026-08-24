"""Validate tool JSON schemas exposed to the LLM."""

from __future__ import annotations

import pytest

from agent.graph import TOOLS


def _schema_for(name: str) -> dict:
    tool = next(t for t in TOOLS if t.name == name)
    return tool.tool_call_schema.model_json_schema()


def _required_properties(name: str) -> set[str]:
    schema = _schema_for(name)
    return set(schema.get("properties", {}).keys())


@pytest.mark.parametrize(
    ("tool_name", "expected_properties"),
    [
        ("get_vehicle_info", set()),
        ("search_web", {"query"}),
        ("search_maintenance_documents", {"query"}),
        ("list_maintenance_records", set()),
        ("get_insurance_info", set()),
        ("get_warranty_info", set()),
    ],
)
def test_tool_schema_exposes_only_llm_visible_params(tool_name, expected_properties):
    assert _required_properties(tool_name) == expected_properties


def test_search_web_schema_does_not_include_vehicle_id():
    schema = _schema_for("search_web")
    props = schema.get("properties", {})
    assert "vehicle_id" not in props
    assert "query" in props


def test_vehicle_scoped_tools_do_not_expose_vehicle_id():
    vehicle_scoped = [
        "get_vehicle_info",
        "search_maintenance_documents",
        "list_maintenance_records",
        "create_maintenance_record",
        "update_maintenance_record",
        "delete_maintenance_record",
        "get_insurance_info",
        "update_insurance_info",
        "get_warranty_info",
        "update_warranty_info",
    ]
    for name in vehicle_scoped:
        schema = _schema_for(name)
        props = schema.get("properties", {})
        assert "vehicle_id" not in props, f"{name} should not expose vehicle_id"
        assert "state" not in props, f"{name} should not expose injected state"
