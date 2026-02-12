from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import WebSocket
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ThoughtEvent(BaseModel):
    """A single thought-stream event sent to the frontend."""

    type: str  # "thinking" | "executing_sql" | "found_insight" | "generating_chart" | "error"
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class ThoughtBroadcaster:
    """Manages WebSocket clients and broadcasts thought events."""

    def __init__(self) -> None:
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.append(ws)
        logger.info("Thought stream client connected (%d total)", len(self._clients))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._clients:
                self._clients.remove(ws)
        logger.info("Thought stream client disconnected (%d total)", len(self._clients))

    async def broadcast(self, event: ThoughtEvent) -> None:
        """Send an event to all connected clients."""
        payload = event.model_dump_json()
        async with self._lock:
            stale: list[WebSocket] = []
            for ws in self._clients:
                try:
                    await ws.send_text(payload)
                except Exception:
                    stale.append(ws)
            for ws in stale:
                self._clients.remove(ws)

    async def send(self, ws: WebSocket, event: ThoughtEvent) -> None:
        """Send an event to a single client."""
        await ws.send_text(event.model_dump_json())

    @property
    def client_count(self) -> int:
        return len(self._clients)
