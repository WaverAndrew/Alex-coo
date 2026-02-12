from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/focus", tags=["focus"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class FocusItemCreate(BaseModel):
    metric_name: str
    display_name: str
    query: str
    threshold_warning: Optional[float] = None
    threshold_alert: Optional[float] = None
    direction: str = "higher_is_better"


class FocusItemUpdate(BaseModel):
    metric_name: Optional[str] = None
    display_name: Optional[str] = None
    query: Optional[str] = None
    threshold_warning: Optional[float] = None
    threshold_alert: Optional[float] = None
    direction: Optional[str] = None
    active: Optional[bool] = None


class FocusItemResponse(BaseModel):
    id: int
    metric_name: str
    display_name: str
    query: str
    threshold_warning: Optional[float] = None
    threshold_alert: Optional[float] = None
    direction: str
    status: str
    current_value: Optional[float] = None
    last_checked: Optional[str] = None
    active: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(item) -> dict[str, Any]:
    return {
        "id": item.id,
        "metric_name": item.metric_name,
        "display_name": item.display_name,
        "query": item.query,
        "threshold_warning": item.threshold_warning,
        "threshold_alert": item.threshold_alert,
        "direction": item.direction,
        "status": item.status,
        "current_value": item.current_value,
        "last_checked": item.last_checked.isoformat() if item.last_checked else None,
        "active": item.active,
    }


def _evaluate_status(value: float, item) -> str:
    """Determine status based on thresholds and direction."""
    if item.direction == "higher_is_better":
        if item.threshold_alert is not None and value <= item.threshold_alert:
            return "alert"
        if item.threshold_warning is not None and value <= item.threshold_warning:
            return "warning"
    else:  # lower_is_better
        if item.threshold_alert is not None and value >= item.threshold_alert:
            return "alert"
        if item.threshold_warning is not None and value >= item.threshold_warning:
            return "warning"
    return "ok"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def list_focus_items(request: Request) -> list[dict[str, Any]]:
    store = request.app.state.memory
    items = store.get_focus_items(active_only=False)
    return [_to_response(i) for i in items]


@router.post("", status_code=201)
async def create_focus_item(body: FocusItemCreate, request: Request) -> dict[str, Any]:
    store = request.app.state.memory
    item = store.save_focus_item(
        metric_name=body.metric_name,
        display_name=body.display_name,
        query=body.query,
        threshold_warning=body.threshold_warning,
        threshold_alert=body.threshold_alert,
        direction=body.direction,
    )
    return _to_response(item)


@router.put("/{item_id}")
async def update_focus_item(
    item_id: int, body: FocusItemUpdate, request: Request
) -> dict[str, Any]:
    store = request.app.state.memory
    updates = body.model_dump(exclude_unset=True)
    item = store.update_focus_item(item_id, **updates)
    if item is None:
        raise HTTPException(status_code=404, detail="Focus item not found")
    return _to_response(item)


@router.delete("/{item_id}", status_code=204)
async def delete_focus_item(item_id: int, request: Request) -> None:
    store = request.app.state.memory
    deleted = store.delete_focus_item(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Focus item not found")


@router.post("/check")
async def check_focus_items(request: Request) -> list[dict[str, Any]]:
    """Evaluate all active focus items by running their SQL queries."""
    store = request.app.state.memory
    warehouse = request.app.state.warehouse

    items = store.get_focus_items(active_only=True)
    results: list[dict[str, Any]] = []

    for item in items:
        try:
            rows = warehouse.execute_query(item.query)
            if rows and len(rows) > 0:
                # Expect the query to return a single numeric value
                first_row = rows[0]
                value = float(list(first_row.values())[0])
                status = _evaluate_status(value, item)
                store.update_focus_item(
                    item.id,
                    current_value=value,
                    status=status,
                    last_checked=datetime.now(timezone.utc),
                )
                results.append({
                    "id": item.id,
                    "metric_name": item.metric_name,
                    "value": value,
                    "status": status,
                    "previous_status": item.status,
                })
            else:
                results.append({
                    "id": item.id,
                    "metric_name": item.metric_name,
                    "error": "Query returned no results",
                })
        except Exception as exc:
            logger.error("Failed to check focus item %s: %s", item.metric_name, exc)
            results.append({
                "id": item.id,
                "metric_name": item.metric_name,
                "error": str(exc),
            })

    return results
