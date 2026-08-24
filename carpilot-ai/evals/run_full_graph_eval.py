"""
Full-graph (Option B) LangSmith evaluation against a live carpilot-ai /chat API.

Usage (from carpilot-ai/, with Aspire or another stack serving /chat):

    set EVAL_API_BASE_URL=http://127.0.0.1:8000
    set LANGSMITH_API_KEY=...
    set LANGSMITH_PROJECT=Carpilot
    uv run python -m evals.run_full_graph_eval

Optional:
    EVAL_AUTH_BEARER=<jwt>     forwarded as Authorization for garage tools
    EVAL_USER_ID=<uuid>        default: demo seed user
    EVAL_VEHICLE_ID=veh-1      overrides example vehicle_id when set
    EVAL_SYNC_ONLY=1           upload dataset only, do not run experiments
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from langsmith import Client, evaluate
from langsmith.evaluation import EvaluationResult

from evals.scoring import score_tool_routing
from evals.tool_routing_dataset import EVAL_DATASET, get_examples

# Aspire / GarageSeedData demo owner
_DEFAULT_USER_ID = "a0000000-0000-4000-8000-000000000001"
_DATASET_NAME = EVAL_DATASET["name"]


def normalize_eval_api_base(raw: str) -> str:
    """Rewrite Aspire *.dev.localhost hosts to 127.0.0.1 (Windows DNS cannot resolve them)."""
    cleaned = raw.strip().rstrip("/")
    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"EVAL_API_BASE_URL must be an absolute URL, got: {raw!r}")
    host = (parsed.hostname or "").lower()
    if host == "localhost" or host.endswith(".localhost"):
        port = parsed.port
        netloc = f"127.0.0.1:{port}" if port else "127.0.0.1"
        rewritten = urlunparse(parsed._replace(netloc=netloc)).rstrip("/")
        print(
            f"Rewrote {cleaned} → {rewritten} "
            "(Python on Windows cannot resolve *.dev.localhost; browsers can)"
        )
        return rewritten
    return cleaned


def _api_base() -> str:
    raw = os.environ.get("EVAL_API_BASE_URL", "").strip().rstrip("/")
    if not raw:
        raise SystemExit(
            "Missing EVAL_API_BASE_URL. Use the Aspire carpilot-ai endpoint, e.g.\n"
            "  $env:EVAL_API_BASE_URL = 'http://127.0.0.1:50694'\n"
            "Dashboard URLs like https://carpilot-ai-carpilot.dev.localhost:PORT "
            "are rewritten to 127.0.0.1 automatically."
        )
    try:
        return normalize_eval_api_base(raw)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


def _loopback(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in {"127.0.0.1", "localhost", "::1"}


def _http_client(timeout: float, base_url: str) -> httpx.Client:
    # Aspire local HTTPS uses a dev cert browsers trust; httpx does not.
    return httpx.Client(
        timeout=timeout,
        verify=not _loopback(base_url),
        follow_redirects=True,
    )


def _with_scheme(url: str, scheme: str) -> str:
    return urlunparse(urlparse(url)._replace(scheme=scheme)).rstrip("/")


def resolve_reachable_api_base(api_base: str) -> str:
    """GET /health; on loopback also try the opposite http/https scheme."""
    candidates = [api_base]
    if _loopback(api_base):
        parsed = urlparse(api_base)
        other = "http" if parsed.scheme == "https" else "https"
        alt = _with_scheme(api_base, other)
        if alt not in candidates:
            candidates.append(alt)

    errors: list[str] = []
    for base in candidates:
        health_url = urljoin(base + "/", "health")
        try:
            with _http_client(10.0, base) as http:
                health = http.get(health_url)
                health.raise_for_status()
            if base != api_base:
                print(f"Health succeeded at {base} (scheme fallback from {api_base})")
            return base
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{health_url}: {exc}")

    detail = "\n".join(errors)
    raise SystemExit(
        f"carpilot-ai health check failed:\n{detail}\n\n"
        "Use the carpilot-ai resource (not webfrontend). In the Aspire dashboard, "
        "copy its HTTP endpoint or set:\n"
        "  $env:EVAL_API_BASE_URL = 'http://127.0.0.1:<port>'\n"
        "Windows cannot resolve *.dev.localhost in Python; the runner maps those hosts "
        "to 127.0.0.1 automatically."
    )


def _configure_langsmith_env() -> None:
    """Align LANGCHAIN_* aliases so the LangSmith client picks up the project."""
    key = os.environ.get("LANGSMITH_API_KEY") or os.environ.get("LANGCHAIN_API_KEY")
    if not key:
        raise SystemExit(
            "Missing LANGSMITH_API_KEY (or LANGCHAIN_API_KEY). "
            "Create a key at https://smith.langchain.com/settings"
        )
    os.environ.setdefault("LANGSMITH_API_KEY", key)
    os.environ.setdefault("LANGCHAIN_API_KEY", key)

    project = (
        os.environ.get("LANGSMITH_PROJECT")
        or os.environ.get("LANGCHAIN_PROJECT")
        or "Carpilot"
    )
    os.environ["LANGSMITH_PROJECT"] = project
    os.environ["LANGCHAIN_PROJECT"] = project

    endpoint = (
        os.environ.get("LANGSMITH_ENDPOINT")
        or os.environ.get("LANGCHAIN_ENDPOINT")
        or "https://api.smith.langchain.com"
    )
    os.environ.setdefault("LANGSMITH_ENDPOINT", endpoint)
    os.environ.setdefault("LANGCHAIN_ENDPOINT", endpoint)


def sync_dataset(client: Client) -> Any:
    """Create or replace examples for the tool-routing dataset."""
    try:
        dataset = client.read_dataset(dataset_name=_DATASET_NAME)
        existing = list(client.list_examples(dataset_id=str(dataset.id)))
        if existing:
            client.delete_examples(example_ids=[str(e.id) for e in existing])
            print(f"Cleared {len(existing)} existing example(s) from {_DATASET_NAME}")
    except Exception:  # noqa: BLE001 — dataset may not exist yet
        dataset = client.create_dataset(
            dataset_name=_DATASET_NAME,
            description=EVAL_DATASET["description"],
        )
        print(f"Created dataset {_DATASET_NAME}")

    examples = get_examples()
    client.create_examples(
        dataset_id=str(dataset.id),
        examples=[
            {
                "inputs": ex["inputs"],
                "outputs": ex["outputs"],
                "metadata": {"source": "carpilot-ai/evals/tool_routing_dataset.py"},
            }
            for ex in examples
        ],
    )
    print(f"Uploaded {len(examples)} example(s) to dataset {_DATASET_NAME}")
    return dataset


def _build_target(api_base: str):
    user_id = os.environ.get("EVAL_USER_ID", _DEFAULT_USER_ID).strip() or _DEFAULT_USER_ID
    vehicle_override = os.environ.get("EVAL_VEHICLE_ID", "").strip()
    auth = os.environ.get("EVAL_AUTH_BEARER", "").strip()
    timeout = float(os.environ.get("EVAL_HTTP_TIMEOUT", "120"))

    def target(inputs: dict[str, Any]) -> dict[str, Any]:
        vehicle_id = vehicle_override or inputs.get("vehicle_id") or "veh-1"
        question = inputs["question"]
        thread_id = f"eval-{uuid.uuid4().hex}"
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = (
                auth if auth.lower().startswith("bearer ") else f"Bearer {auth}"
            )

        url = urljoin(api_base + "/", "chat")
        payload = {
            "message": question,
            "thread_id": thread_id,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
        }
        with _http_client(timeout, api_base) as http:
            response = http.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        tools = data.get("tools_called") or []
        if not isinstance(tools, list):
            tools = []
        return {
            "content": data.get("content") or "",
            "tools_called": [str(t) for t in tools],
            "thread_id": data.get("thread_id") or thread_id,
            "vehicle_id": vehicle_id,
        }

    return target


def tool_routing_evaluator(run: Any, example: Any) -> EvaluationResult:
    reference = example.outputs or {}
    outputs = run.outputs or {}
    tools = outputs.get("tools_called") or []
    result = score_tool_routing(list(tools), dict(reference))
    return EvaluationResult(
        key=result["key"],
        score=result["score"],
        comment=result.get("comment"),
    )


def run_experiment(client: Client, api_base: str) -> None:
    api_base = resolve_reachable_api_base(api_base)
    print(f"Running full-graph eval against {api_base} …")
    results = evaluate(
        _build_target(api_base),
        data=_DATASET_NAME,
        evaluators=[tool_routing_evaluator],
        experiment_prefix="full-graph-tool-routing",
        metadata={
            "mode": "full_graph_http",
            "api_base": api_base,
            "dataset": _DATASET_NAME,
        },
        client=client,
        max_concurrency=1,
    )
    print(results)
    print(
        "\nOpen LangSmith → Datasets → "
        f"{_DATASET_NAME} → Experiments to inspect scores."
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CarPilot full-graph LangSmith eval")
    parser.add_argument(
        "--sync-only",
        action="store_true",
        help="Upload/replace the dataset only (no /chat calls).",
    )
    args = parser.parse_args(argv)

    _configure_langsmith_env()
    sync_only = args.sync_only or os.environ.get("EVAL_SYNC_ONLY", "").strip() in {
        "1",
        "true",
        "yes",
    }

    client = Client()
    sync_dataset(client)

    if sync_only:
        print("Sync-only mode; skipping experiment.")
        return 0

    api_base = _api_base()
    run_experiment(client, api_base)
    return 0


if __name__ == "__main__":
    sys.exit(main())
