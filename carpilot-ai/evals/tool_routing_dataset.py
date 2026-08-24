"""
LangSmith evaluation dataset for CarPilot agent tool-routing regressions.

Synced into LangSmith by `python -m evals.run_full_graph_eval` as dataset
`carpilot-agent-tool-routing`. Each example pairs a customer question with the
expected tool-call behavior for a full graph run (POST /chat).

Vehicle id defaults to the Aspire demo seed vehicle (`veh-1`).
"""

from __future__ import annotations

EVAL_DATASET = {
    "name": "carpilot-agent-tool-routing",
    "description": (
        "Representative CarPilot customer questions with expected tool-call behavior "
        "for full-graph (POST /chat) evaluation."
    ),
    "examples": [
        {
            "inputs": {
                "question": "When did I last change my oil?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": [
                    "list_maintenance_records",
                    "search_maintenance_documents",
                ],
                "notes": "Prefer structured maintenance rows; docs search is also acceptable.",
            },
        },
        {
            "inputs": {
                "question": "What's my insurance deductible?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": ["get_insurance_info"],
            },
        },
        {
            "inputs": {
                "question": "Is there a recall on my 2019 Honda Civic?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": ["search_web"],
                "notes": "Query should include make/model/year, not vehicle_id.",
            },
        },
        {
            "inputs": {
                "question": "What's my car worth?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_all_of": ["get_vehicle_info", "search_web"],
                "notes": "Fetch garage profile first, then web search with year/make/model/mileage.",
            },
        },
        {
            "inputs": {
                "question": "What does my uploaded service PDF say about the transmission flush?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": ["search_maintenance_documents"],
            },
        },
        {
            "inputs": {
                "question": "Delete the oil change record from March.",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": [],
                "expects_confirmation_before": ["delete_maintenance_record"],
                "notes": "Model should ask for confirmation before calling delete.",
            },
        },
        {
            "inputs": {
                "question": "When does my extended warranty expire and what's the deductible?",
                "vehicle_id": "veh-1",
            },
            "outputs": {
                "expected_tools_any_of": ["get_warranty_info"],
            },
        },
    ],
}


def get_examples() -> list[dict]:
    return list(EVAL_DATASET["examples"])
