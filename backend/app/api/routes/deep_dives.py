"""Deep Dive API — create and manage long-running research analyses."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from backend.app.agents.deep_dive_agent import DeepDiveAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/deep-dives", tags=["deep-dives"])

# In-memory store for active deep dives (for hackathon; production would use DB)
_active_dives: dict[str, dict[str, Any]] = {}


class CreateDeepDiveRequest(BaseModel):
    topic: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class DeepDiveStatus(BaseModel):
    id: str
    topic: str
    status: str  # "processing" | "complete" | "error"
    progress: int  # 0-100
    title: str | None = None
    content: str | None = None
    charts: list[dict[str, Any]] = Field(default_factory=list)


@router.post("", response_model=DeepDiveStatus)
async def create_deep_dive(body: CreateDeepDiveRequest, request: Request) -> DeepDiveStatus:
    """Start a new deep dive research analysis. Returns immediately with the dive ID.
    The analysis runs in the background — poll GET /api/deep-dives/{id} for status."""

    dive_id = f"dive-{uuid.uuid4().hex[:8]}"

    _active_dives[dive_id] = {
        "id": dive_id,
        "topic": body.topic,
        "status": "processing",
        "progress": 0,
        "title": None,
        "content": None,
        "charts": [],
    }

    # Start background task
    agent = DeepDiveAgent(
        warehouse=request.app.state.warehouse,
        broadcaster=request.app.state.broadcaster,
        settings=request.app.state.settings,
    )

    async def _run_dive():
        try:
            result = await agent.run(body.topic, dive_id)
            _active_dives[dive_id].update({
                "status": "complete",
                "progress": 100,
                "title": result.get("title"),
                "content": result.get("content", ""),
                "charts": result.get("charts", []),
            })
        except Exception as exc:
            logger.exception("Deep dive %s failed", dive_id)
            _active_dives[dive_id].update({
                "status": "error",
                "progress": 0,
                "content": f"Analysis failed: {str(exc)[:500]}",
            })

    asyncio.create_task(_run_dive())

    return DeepDiveStatus(**_active_dives[dive_id])


@router.get("/{dive_id}", response_model=DeepDiveStatus)
async def get_deep_dive(dive_id: str) -> DeepDiveStatus:
    """Get the current status of a deep dive."""
    if dive_id not in _active_dives:
        return DeepDiveStatus(id=dive_id, topic="", status="not_found", progress=0)
    return DeepDiveStatus(**_active_dives[dive_id])


@router.get("", response_model=list[DeepDiveStatus])
async def list_deep_dives() -> list[DeepDiveStatus]:
    """List all deep dives."""
    return [DeepDiveStatus(**d) for d in _active_dives.values()]
