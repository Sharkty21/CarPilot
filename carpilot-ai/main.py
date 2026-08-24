"""CarPilot AI FastAPI service — chat, streaming, and document ingestion."""

from __future__ import annotations

import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel, Field

from agent.graph import close_graph, get_graph, init_graph, run_config
from agent.message_utils import tools_called_from_messages
from clients.auth_context import access_token_scope
from clients.db import close_pool, init_pool, list_documents
from config import get_settings
from ingestion.pipeline import ingest_document
from seed_docs import seed_demo_documents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _configure_langsmith() -> None:
    settings = get_settings()
    tracing = "true" if settings.langchain_tracing_v2 else "false"
    os.environ["LANGSMITH_TRACING"] = tracing
    os.environ["LANGCHAIN_TRACING_V2"] = tracing
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    os.environ["LANGCHAIN_ENDPOINT"] = settings.langsmith_endpoint
    if settings.langchain_api_key:
        os.environ["LANGSMITH_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        return None
    return value.strip()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _configure_langsmith()
    await init_pool()
    await init_graph()
    try:
        await seed_demo_documents()
    except Exception:  # noqa: BLE001
        logger.exception("Demo document seed failed (chat will still work)")
    logger.info("carpilot-ai ready (env=%s)", get_settings().environment)
    try:
        yield
    finally:
        await close_graph()
        await close_pool()


app = FastAPI(title="CarPilot AI", version="0.1.0", lifespan=lifespan)


class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_id: str
    vehicle_id: str


class ChatResponse(BaseModel):
    thread_id: str
    content: str
    messages: list[dict[str, Any]] = Field(default_factory=list)
    # Ordered tool names requested during the graph run (for evals / debugging).
    tools_called: list[str] = Field(default_factory=list)


def _last_ai_text(messages: list[Any]) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            content = msg.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        parts.append(block.get("text", ""))
                    elif isinstance(block, str):
                        parts.append(block)
                return "".join(parts)
    return ""


def _chunk_text(content: Any) -> str:
    if not content:
        return ""
    if isinstance(content, list):
        return "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


def _citations_from_tool(name: str, output: Any) -> list[dict[str, Any]]:
    """Map tool outputs to ChatCitation-shaped events for the frontend."""
    citations: list[dict[str, Any]] = []
    text = output if isinstance(output, str) else json.dumps(output)

    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return citations

    if name == "search_maintenance_documents" and isinstance(payload, list):
        for hit in payload[:5]:
            if not isinstance(hit, dict):
                continue
            filename = hit.get("filename") or "document"
            detail = (hit.get("content") or "")[:160]
            citations.append(
                {
                    "id": f"cite-{uuid.uuid4()}",
                    "kind": "document",
                    "label": filename,
                    "detail": detail,
                }
            )
    elif name == "list_maintenance_records" and isinstance(payload, list):
        for record in payload[:5]:
            if not isinstance(record, dict):
                continue
            citations.append(
                {
                    "id": f"cite-{uuid.uuid4()}",
                    "kind": "record",
                    "label": record.get("description") or record.get("type") or "record",
                    "detail": record.get("date"),
                    "recordId": record.get("id"),
                }
            )
    elif name == "search_web":
        if isinstance(payload, list) and payload:
            for item in payload[:3]:
                if not isinstance(item, dict):
                    continue
                citations.append(
                    {
                        "id": f"cite-{uuid.uuid4()}",
                        "kind": "web",
                        "label": item.get("title") or "Web result",
                        "detail": (item.get("body") or "")[:160],
                        "url": item.get("href"),
                    }
                )
        else:
            citations.append(
                {
                    "id": f"cite-{uuid.uuid4()}",
                    "kind": "web",
                    "label": "Web search",
                    "detail": text[:160],
                }
            )
    return citations


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    authorization: str | None = Header(default=None),
) -> ChatResponse:
    graph = get_graph()
    config = run_config(
        thread_id=req.thread_id,
        user_id=req.user_id,
        vehicle_id=req.vehicle_id,
        endpoint="chat",
    )
    with access_token_scope(_bearer_token(authorization)):
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=req.message)],
                "user_id": req.user_id,
                "vehicle_id": req.vehicle_id,
            },
            config=config,
        )
    messages = result.get("messages") or []
    tools_called = tools_called_from_messages(messages)
    return ChatResponse(
        thread_id=req.thread_id,
        content=_last_ai_text(messages),
        tools_called=tools_called,
        messages=[
            {
                "type": getattr(m, "type", m.__class__.__name__),
                "content": getattr(m, "content", str(m)),
                **(
                    {"tool_calls": getattr(m, "tool_calls", None)}
                    if getattr(m, "tool_calls", None)
                    else {}
                ),
            }
            for m in messages
        ],
    )


@app.post("/chat/stream")
async def chat_stream(
    req: ChatRequest,
    authorization: str | None = Header(default=None),
) -> StreamingResponse:
    graph = get_graph()
    config = run_config(
        thread_id=req.thread_id,
        user_id=req.user_id,
        vehicle_id=req.vehicle_id,
        endpoint="chat_stream",
    )
    token = _bearer_token(authorization)

    async def event_generator() -> AsyncIterator[str]:
        with access_token_scope(token):
            try:
                async for event in graph.astream_events(
                    {
                        "messages": [HumanMessage(content=req.message)],
                        "user_id": req.user_id,
                        "vehicle_id": req.vehicle_id,
                    },
                    config=config,
                    version="v2",
                ):
                    kind = event.get("event")
                    if kind == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk")
                        if chunk is None:
                            continue
                        text = _chunk_text(getattr(chunk, "content", None))
                        if text:
                            yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"
                    elif kind == "on_tool_start":
                        name = event.get("name") or event.get("data", {}).get("name")
                        yield f"data: {json.dumps({'type': 'tool', 'name': name, 'status': 'start'})}\n\n"
                    elif kind == "on_tool_end":
                        name = event.get("name") or ""
                        output = event.get("data", {}).get("output")
                        if hasattr(output, "content"):
                            output = output.content
                        yield f"data: {json.dumps({'type': 'tool', 'name': name, 'status': 'end'})}\n\n"
                        for citation in _citations_from_tool(name, output):
                            yield f"data: {json.dumps({'type': 'citation', 'citation': citation})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as exc:  # noqa: BLE001
                logger.exception("chat stream failed")
                yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    vehicle_id: str = Form(...),
    user_id: str = Form(...),
) -> dict[str, Any]:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        result = await ingest_document(
            content=content,
            filename=file.filename or "upload.bin",
            content_type=file.content_type,
            vehicle_id=vehicle_id,
            user_id=user_id,
        )
        return result
    except Exception as exc:  # noqa: BLE001
        logger.exception("document upload failed")
        raise HTTPException(
            status_code=422,
            detail=f"Ingestion failed closed (no unredacted text was embedded): {exc}",
        ) from exc


@app.get("/documents/{vehicle_id}")
async def get_documents(vehicle_id: str) -> dict[str, Any]:
    docs = await list_documents(vehicle_id)
    return {"vehicle_id": vehicle_id, "documents": docs}
