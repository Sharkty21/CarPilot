"""LangGraph ReAct agent with tool-calling loop and Postgres checkpointer."""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from psycopg_pool import AsyncConnectionPool

from agent.prompts import SYSTEM_PROMPT
from agent.state import AgentState
from config import get_settings
from tools.document_tools import attach_document
from tools.finance_tools import get_finance_info, update_finance_info
from tools.insurance_tools import get_insurance_info, update_insurance_info
from tools.maintenance_tools import (
    create_maintenance_record,
    delete_maintenance_record,
    list_maintenance_records,
    update_maintenance_record,
)
from tools.vector_search import search_maintenance_documents
from tools.vehicle_tools import get_vehicle_info
from tools.warranty_tools import get_warranty_info, update_warranty_info
from tools.web_search import search_web

logger = logging.getLogger(__name__)

TOOLS = [
    get_vehicle_info,
    search_maintenance_documents,
    search_web,
    create_maintenance_record,
    update_maintenance_record,
    delete_maintenance_record,
    list_maintenance_records,
    get_insurance_info,
    update_insurance_info,
    get_warranty_info,
    update_warranty_info,
    get_finance_info,
    update_finance_info,
    attach_document,
]

_checkpointer_pool: AsyncConnectionPool | None = None
_checkpointer: AsyncPostgresSaver | None = None
_compiled_graph = None


def build_graph(checkpointer: AsyncPostgresSaver | None = None):
    """Build and compile the agent StateGraph (optionally with a checkpointer)."""
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key or None,
        temperature=0.2,
        streaming=True,
    )
    llm_with_tools = llm.bind_tools(TOOLS)

    async def agent_node(state: AgentState) -> dict[str, Any]:
        messages = list(state["messages"])
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]

        # Active garage context — vehicle-scoped tools receive vehicle_id automatically.
        context = SystemMessage(
            content=(
                f"Active garage context: user_id={state.get('user_id')}, "
                f"vehicle_id={state.get('vehicle_id')}. "
                "Garage-scoped tools (maintenance, insurance, warranty, finance, documents, "
                "get_vehicle_info) apply to this vehicle automatically. "
                "search_web accepts only a query string — never pass vehicle_id. "
                "For worth/price/resale/trade-in: get_vehicle_info then search_web with "
                "year/make/model/trim/mileage; do not treat estimatedValue as live market truth."
            )
        )
        # Insert context after the system prompt.
        call_messages = [messages[0], context, *messages[1:]]
        response = await llm_with_tools.ainvoke(call_messages)
        return {"messages": [response]}

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", ToolNode(TOOLS))
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")
    return graph.compile(checkpointer=checkpointer)


async def init_graph():
    """Initialize the AsyncPostgresSaver checkpointer and compile the graph."""
    global _checkpointer_pool, _checkpointer, _compiled_graph

    settings = get_settings()
    # psycopg wants postgresql:// ; asyncpg URLs are compatible after scheme normalize.
    conninfo = settings.database_url
    if conninfo.startswith("postgres://"):
        conninfo = "postgresql://" + conninfo[len("postgres://") :]
    # Keepalive + connect timeout for flaky Azure Files Postgres (libpq / psycopg only).
    sep = "&" if "?" in conninfo else "?"
    conninfo = (
        f"{conninfo}{sep}connect_timeout=30&keepalives=1&keepalives_idle=30"
        "&keepalives_interval=10&keepalives_count=3"
    )

    _checkpointer_pool = AsyncConnectionPool(
        conninfo=conninfo,
        min_size=1,
        max_size=10,
        kwargs={"autocommit": True, "prepare_threshold": 0},
        check=AsyncConnectionPool.check_connection,
        max_idle=60.0,
        reconnect_timeout=30.0,
        open=False,
    )
    await _checkpointer_pool.open()
    _checkpointer = AsyncPostgresSaver(_checkpointer_pool)
    await _checkpointer.setup()
    _compiled_graph = build_graph(_checkpointer)
    logger.info("LangGraph agent compiled with AsyncPostgresSaver")
    return _compiled_graph


async def close_graph() -> None:
    global _checkpointer_pool, _checkpointer, _compiled_graph
    _compiled_graph = None
    _checkpointer = None
    if _checkpointer_pool is not None:
        await _checkpointer_pool.close()
        _checkpointer_pool = None


def get_graph():
    if _compiled_graph is None:
        raise RuntimeError("Graph is not initialized. Call init_graph() on startup.")
    return _compiled_graph


def run_config(
    *,
    thread_id: str,
    user_id: str,
    vehicle_id: str,
    endpoint: str,
) -> dict[str, Any]:
    """LangSmith-filterable config attached to every graph invocation."""
    settings = get_settings()
    return {
        "configurable": {"thread_id": thread_id},
        "metadata": {
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "endpoint": endpoint,
        },
        "tags": ["carpilot-agent", settings.environment],
        "run_name": f"carpilot-{endpoint}",
    }
