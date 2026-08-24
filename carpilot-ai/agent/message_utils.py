"""Helpers for inspecting LangGraph / LangChain message lists."""

from __future__ import annotations

from typing import Any


def tools_called_from_messages(messages: list[Any]) -> list[str]:
    """Return tool names requested by AI messages, in call order (may repeat)."""
    names: list[str] = []
    for msg in messages:
        tool_calls = getattr(msg, "tool_calls", None) or []
        for call in tool_calls:
            if isinstance(call, dict):
                name = call.get("name")
            else:
                name = getattr(call, "name", None)
            if name:
                names.append(str(name))
    return names
