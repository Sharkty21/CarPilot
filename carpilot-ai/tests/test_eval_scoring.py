"""Unit tests for tool-name extraction and eval scoring."""

from __future__ import annotations

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from agent.message_utils import tools_called_from_messages
from evals.run_full_graph_eval import extract_access_token, normalize_eval_api_base
from evals.scoring import score_tool_routing


def test_tools_called_from_messages_ordered_unique_per_call():
    messages = [
        HumanMessage(content="deductible?"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_insurance_info",
                    "args": {},
                    "id": "c1",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content="{}", tool_call_id="c1"),
        AIMessage(content="Your deductible is $500."),
    ]
    assert tools_called_from_messages(messages) == ["get_insurance_info"]


def test_tools_called_multiple_rounds():
    messages = [
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_vehicle_info",
                    "args": {},
                    "id": "a",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content="{}", tool_call_id="a"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "search_web",
                    "args": {"query": "value"},
                    "id": "b",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content="{}", tool_call_id="b"),
        AIMessage(content="About $18k."),
    ]
    assert tools_called_from_messages(messages) == [
        "get_vehicle_info",
        "search_web",
    ]


def test_score_any_of_pass():
    result = score_tool_routing(
        ["list_maintenance_records"],
        {"expected_tools_any_of": ["list_maintenance_records", "search_maintenance_documents"]},
    )
    assert result["score"] == 1.0


def test_score_any_of_fail():
    result = score_tool_routing(
        ["search_web"],
        {"expected_tools_any_of": ["get_insurance_info"]},
    )
    assert result["score"] == 0.0


def test_score_all_of_requires_both():
    assert (
        score_tool_routing(
            ["get_vehicle_info"],
            {"expected_tools_all_of": ["get_vehicle_info", "search_web"]},
        )["score"]
        == 0.0
    )
    assert (
        score_tool_routing(
            ["get_vehicle_info", "search_web"],
            {"expected_tools_all_of": ["get_vehicle_info", "search_web"]},
        )["score"]
        == 1.0
    )


def test_normalize_aspire_dev_localhost_to_loopback():
    assert (
        normalize_eval_api_base("https://carpilot-ai-carpilot.dev.localhost:50694")
        == "https://127.0.0.1:50694"
    )
    assert normalize_eval_api_base("http://127.0.0.1:8000/") == "http://127.0.0.1:8000"


def test_extract_access_token_shapes():
    assert extract_access_token({"accessToken": "abc"}) == "abc"
    assert extract_access_token({"access_token": "xyz"}) == "xyz"
    assert extract_access_token({"other": "nope"}) is None


def test_score_confirmation_blocks_delete():
    result = score_tool_routing(
        ["delete_maintenance_record"],
        {
            "expected_tools_any_of": [],
            "expects_confirmation_before": ["delete_maintenance_record"],
        },
    )
    assert result["score"] == 0.0

    result_ok = score_tool_routing(
        [],
        {
            "expected_tools_any_of": [],
            "expects_confirmation_before": ["delete_maintenance_record"],
        },
    )
    assert result_ok["score"] == 1.0
