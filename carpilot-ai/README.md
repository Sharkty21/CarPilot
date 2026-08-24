# carpilot-ai

Conversational AI microservice for CarPilot. FastAPI + LangGraph agent with:

- RAG over customer documents (pgvector)
- Open-web research
- Maintenance / insurance / warranty CRUD via the .NET API
- Presidio PII redaction before any embedding
- LangSmith tracing on every run
- AsyncPostgresSaver checkpointer for multi-turn threads

## Local (Aspire)

The AppHost runs this with `uv` via `AddUvicornApp(...).WithUv()`. Required parameters (set as Aspire parameters / user secrets):

- `openai-api-key`
- `langchain-api-key` (optional but recommended; tracing is on by default)

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/chat` | Non-streaming turn (`ainvoke`) |
| POST | `/chat/stream` | SSE stream: `token`, `tool`, `citation`, `done`, `error` |
| POST | `/documents/upload` | Store original → extract → redact → embed |
| GET | `/documents/{vehicle_id}` | Document metadata listing |
| GET | `/health` | Health check |

Pass the caller's `Authorization: Bearer <jwt>` on chat requests. That token is forwarded on tool calls to the .NET API so garage writes run as the signed-in user.

The ASP.NET server exposes `POST /api/vehicles/{id}/assistant/ask/stream` as a BFF that proxies this SSE stream to the React chat UI.

## Demo seed documents

On startup, if `veh-1` has no rows in `ai_document_registry`, the service ingests text fixtures from `seed-docs/` (insurance declarations, warranty contract/schedule, oil-change and brake invoices) so RAG and tool-calling have real content to search.

## Environment

All configuration is via `pydantic-settings` (no production defaults baked into code):

`DATABASE_URL`, `LANGSMITH_API_KEY` (or `LANGCHAIN_API_KEY`), `LANGSMITH_PROJECT` (or `LANGCHAIN_PROJECT`), `LANGSMITH_TRACING` (or `LANGCHAIN_TRACING_V2`), `LANGSMITH_ENDPOINT`, `OPENAI_API_KEY`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `DOTNET_API_BASE_URL`, `ENVIRONMENT`.

## LangSmith — finding a user's conversation

Every graph invocation attaches filterable metadata and tags:

```python
config = {
    "configurable": {"thread_id": req.thread_id},
    "metadata": {
        "user_id": req.user_id,
        "vehicle_id": req.vehicle_id,
        "endpoint": "chat_stream",  # or "chat"
    },
    "tags": ["carpilot-agent", settings.environment],  # e.g. "dev" / "prod"
}
```

**How to find a conversation in the LangSmith UI**

1. Open the project named by `LANGSMITH_PROJECT` (default `Carpilot`).
2. Filter runs by tag `carpilot-agent` and environment tag (`dev` / `prod`).
3. Add a metadata filter: `user_id` = the customer's id, and optionally `vehicle_id`.
4. Open a matching run — tool calls appear as child spans under the parent agent run (vector search, web search, CRUD tools).
5. To follow one chat thread across turns, filter or search by `thread_id` (LangGraph checkpointer thread), which is also in `configurable.thread_id`.

Ingestion (`redact_pii`, `embed_and_store`, `ingest_document`) is also `@traceable`, so a bad RAG answer can be traced back to the ingestion run that produced the chunk — not only the chat run.

## Ingestion pipeline (fail closed)

```
upload → private bucket (original)
      → extract text
      → Presidio redact  ← gate; unredacted text never reaches embed
      → chunk + embed redacted text into pgvector
```

## Tests

```bash
uv sync --extra dev
uv run python -m spacy download en_core_web_sm
uv run pytest
```

## Full-graph eval (LangSmith)

Option B: each dataset row calls live `POST /chat` (full LangGraph agent + tools), then scores which tools ran.

Dataset source: `evals/tool_routing_dataset.py` → LangSmith dataset `carpilot-agent-tool-routing`.

### Run locally / against a test API

1. Start Aspire (or another environment) so `carpilot-ai` serves `/health` and `/chat`.
2. From `carpilot-ai/`:

```bash
# PowerShell
# Prefer loopback + the Aspire carpilot-ai port (not webfrontend).
# Dashboard hosts like https://carpilot-ai-carpilot.dev.localhost:50694 also work;
# the runner rewrites them to 127.0.0.1 because Windows DNS cannot resolve *.dev.localhost.
$env:EVAL_API_BASE_URL = "http://127.0.0.1:50694"
$env:LANGSMITH_API_KEY = "<key from smith.langchain.com/settings>"
$env:LANGSMITH_PROJECT = "Carpilot"
# Optional — needed if garage CRUD tools require a user JWT:
# $env:EVAL_AUTH_BEARER = "<access token>"
# $env:EVAL_USER_ID = "a0000000-0000-4000-8000-000000000001"
# $env:EVAL_VEHICLE_ID = "veh-1"

uv run python -m evals.run_full_graph_eval
```

Upload dataset only (no LLM / API calls):

```bash
uv run python -m evals.run_full_graph_eval --sync-only
```

### LangSmith UI — step by step after a run

1. Open [https://smith.langchain.com](https://smith.langchain.com) and sign in to the same workspace as your API key.
2. Confirm the **tracing project** name matches `LANGSMITH_PROJECT` (default **Carpilot**). Live chat traces land here; eval experiments are linked from the dataset.
3. In the left nav, open **Datasets & Experiments** (or **Datasets**).
4. Open dataset **`carpilot-agent-tool-routing`**. You should see the 7 examples (question + expected tools).
5. Open the **Experiments** tab on that dataset.
6. Click the latest experiment (prefix `full-graph-tool-routing-…`).
7. Review per-example **tool_routing** score (1.0 pass / 0.0 fail) and the comment (`actual=…`, `any_of=…`, etc.).
8. Open a single example run to see the full `/chat` output (`tools_called`, answer text) and any nested LangSmith traces if tracing was on in the AI service.

**Note:** The dataset lives under **Datasets** in your LangSmith workspace; it is not a folder *inside* the Carpilot tracing project. Same account/workspace; different UI area.

## Production container

```bash
docker build -t carpilot-ai .
docker run --env-file .env -p 8000:8000 carpilot-ai
```
