from __future__ import annotations

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """Shared state for the CarPilot agent graph."""

    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    vehicle_id: str
