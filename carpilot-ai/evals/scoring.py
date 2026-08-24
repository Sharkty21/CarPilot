"""Pure scoring helpers for tool-routing evals (no LangSmith / HTTP)."""

from __future__ import annotations

from typing import Any


def score_tool_routing(
    tools_called: list[str],
    reference: dict[str, Any],
) -> dict[str, Any]:
    """
    Score a full-graph run against dataset reference outputs.

    Rules (checked in order):
    1. expects_confirmation_before — fail if any forbidden tool was called.
    2. expected_tools_all_of — every listed tool must appear.
    3. expected_tools_any_of — at least one listed tool must appear (empty = no
       required tools beyond confirmation rules).
    """
    actual = set(tools_called)
    forbidden = set(reference.get("expects_confirmation_before") or [])
    all_of = set(reference.get("expected_tools_all_of") or [])
    any_of = set(reference.get("expected_tools_any_of") or [])

    comment_parts: list[str] = [f"actual={sorted(actual)}"]

    if forbidden:
        leaked = actual & forbidden
        ok = not leaked
        comment_parts.append(f"forbidden={sorted(forbidden)}")
        if leaked:
            comment_parts.append(f"leaked={sorted(leaked)}")
        return {
            "key": "tool_routing",
            "score": 1.0 if ok else 0.0,
            "comment": "; ".join(comment_parts),
        }

    if all_of:
        missing = all_of - actual
        ok = not missing
        comment_parts.append(f"all_of={sorted(all_of)}")
        if missing:
            comment_parts.append(f"missing={sorted(missing)}")
        return {
            "key": "tool_routing",
            "score": 1.0 if ok else 0.0,
            "comment": "; ".join(comment_parts),
        }

    if any_of:
        hit = actual & any_of
        ok = bool(hit)
        comment_parts.append(f"any_of={sorted(any_of)}")
        if hit:
            comment_parts.append(f"hit={sorted(hit)}")
        return {
            "key": "tool_routing",
            "score": 1.0 if ok else 0.0,
            "comment": "; ".join(comment_parts),
        }

    # No tool expectations — pass (e.g. pure confirmation turn with empty any_of).
    return {
        "key": "tool_routing",
        "score": 1.0,
        "comment": "; ".join(comment_parts) + "; no required tools",
    }
