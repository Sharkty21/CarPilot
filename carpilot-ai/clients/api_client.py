"""Async HTTP client for the CarPilot .NET API (source of truth for garage writes)."""

from __future__ import annotations

from typing import Any

import httpx

from clients.auth_context import get_access_token
from config import get_settings


class DotNetApiClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        settings = get_settings()
        self._base_url = (base_url or settings.dotnet_api_base_url).rstrip("/")
        self._timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        headers: dict[str, str] = {}
        token = get_access_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
            headers=headers,
        )

    async def get_vehicle(self, vehicle_id: str) -> dict[str, Any] | None:
        async with self._client() as client:
            response = await client.get("/api/vehicles")
            response.raise_for_status()
            vehicles = response.json()
        for vehicle in vehicles:
            if vehicle.get("id") == vehicle_id:
                return vehicle
        return None

    async def get_maintenance_records(self, vehicle_id: str) -> list[dict[str, Any]]:
        async with self._client() as client:
            response = await client.get(f"/api/vehicles/{vehicle_id}/maintenance-records")
            response.raise_for_status()
            return response.json()

    async def save_maintenance_record(
        self,
        vehicle_id: str,
        record_id: str,
        record: dict[str, Any],
    ) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.put(
                f"/api/vehicles/{vehicle_id}/maintenance-records/{record_id}",
                json=record,
            )
            response.raise_for_status()
            return response.json()

    async def delete_maintenance_record(self, vehicle_id: str, record_id: str) -> None:
        async with self._client() as client:
            response = await client.delete(
                f"/api/vehicles/{vehicle_id}/maintenance-records/{record_id}"
            )
            response.raise_for_status()

    async def update_insurance(
        self,
        vehicle_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.put(
                f"/api/vehicles/{vehicle_id}/insurance",
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def update_warranty(
        self,
        vehicle_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.put(
                f"/api/vehicles/{vehicle_id}/warranty",
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def update_finance(
        self,
        vehicle_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.put(
                f"/api/vehicles/{vehicle_id}/finance",
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def commit_staged_document(
        self,
        vehicle_id: str,
        section: str,
        staging_id: str,
    ) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.post(
                f"/api/vehicles/{vehicle_id}/documents/{section}/commit/{staging_id}"
            )
            response.raise_for_status()
            return response.json()


_api_client: DotNetApiClient | None = None


def get_api_client() -> DotNetApiClient:
    global _api_client
    if _api_client is None:
        _api_client = DotNetApiClient()
    return _api_client
