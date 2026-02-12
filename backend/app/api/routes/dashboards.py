from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class DashboardCreate(BaseModel):
    title: str
    description: Optional[str] = None
    chart_configs: list[dict[str, Any]] = Field(default_factory=list)
    pinned: bool = False


class DashboardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    chart_configs: Optional[list[dict[str, Any]]] = None
    pinned: Optional[bool] = None


class DashboardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    chart_configs: list[dict[str, Any]] = Field(default_factory=list)
    pinned: bool = False
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(dashboard) -> dict[str, Any]:
    return {
        "id": dashboard.id,
        "title": dashboard.title,
        "description": dashboard.description,
        "chart_configs": dashboard.get_chart_configs(),
        "pinned": dashboard.pinned,
        "created_at": dashboard.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def list_dashboards(request: Request) -> list[dict[str, Any]]:
    store = request.app.state.memory
    dashboards = store.get_dashboards()
    return [_to_response(d) for d in dashboards]


@router.get("/{dashboard_id}")
async def get_dashboard(dashboard_id: int, request: Request) -> dict[str, Any]:
    store = request.app.state.memory
    dashboard = store.get_dashboard(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return _to_response(dashboard)


@router.post("", status_code=201)
async def create_dashboard(body: DashboardCreate, request: Request) -> dict[str, Any]:
    store = request.app.state.memory
    dashboard = store.save_dashboard(
        title=body.title,
        description=body.description,
        chart_configs=body.chart_configs,
        pinned=body.pinned,
    )
    return _to_response(dashboard)


@router.put("/{dashboard_id}")
async def update_dashboard(
    dashboard_id: int, body: DashboardUpdate, request: Request
) -> dict[str, Any]:
    store = request.app.state.memory
    updates = body.model_dump(exclude_unset=True)
    dashboard = store.update_dashboard(dashboard_id, **updates)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return _to_response(dashboard)


@router.delete("/{dashboard_id}", status_code=204)
async def delete_dashboard(dashboard_id: int, request: Request) -> None:
    store = request.app.state.memory
    deleted = store.delete_dashboard(dashboard_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dashboard not found")


@router.put("/{dashboard_id}/pin")
async def toggle_pin(dashboard_id: int, request: Request) -> dict[str, Any]:
    store = request.app.state.memory
    dashboard = store.get_dashboard(dashboard_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    updated = store.update_dashboard(dashboard_id, pinned=not dashboard.pinned)
    return _to_response(updated)
