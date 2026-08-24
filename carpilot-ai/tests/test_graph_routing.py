"""Unit tests for LangGraph tools_condition routing."""

from __future__ import annotations

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.graph import END
from langgraph.prebuilt import tools_condition

from agent.state import AgentState


def _state(messages) -> AgentState:
    return {
        "messages": messages,
        "user_id": "user-1",
        "vehicle_id": "veh-1",
    }


def test_tools_condition_routes_to_tools_when_tool_calls_present():
    message = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "search_web",
                "args": {"query": "toyota recall"},
                "id": "call-1",
                "type": "tool_call",
            }
        ],
    )
    route = tools_condition(_state([HumanMessage(content="any recalls?"), message]))
    assert route == "tools"


def test_tools_condition_routes_to_end_without_tool_calls():
    message = AIMessage(content="Your last oil change was in March.")
    route = tools_condition(_state([HumanMessage(content="when was oil?"), message]))
    assert route == END


def test_tools_condition_after_tool_result_still_depends_on_latest_ai():
    # After tools run, the latest AI message without tool_calls should end.
    messages = [
        HumanMessage(content="what's my deductible?"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "get_insurance_info",
                    "args": {"vehicle_id": "veh-1"},
                    "id": "call-2",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content='{"deductible": 500}', tool_call_id="call-2"),
        AIMessage(content="Your deductible is $500."),
    ]
    assert tools_condition(_state(messages)) == END
