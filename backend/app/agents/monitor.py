"""Monitor agent — background checker for focus items.

Periodically evaluates each active focus item's SQL query, compares the
result against warning/alert thresholds, and updates the item's status.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster, ThoughtEvent

logger = logging.getLogger(__name__)


class MonitorAgent:
    """Checks all active focus items and returns alerts for status changes."""

    def __init__(
        self,
        warehouse: DuckDBWarehouse,
        memory_store: MemoryStore,
        thought_broadcaster: ThoughtBroadcaster,
    ) -> None:
        self.warehouse = warehouse
        self.memory = memory_store
        self.broadcaster = thought_broadcaster

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def check_focus_items(self) -> list[dict[str, Any]]:
        """Evaluate every active focus item and return a list of results.

        Each result dict contains:
            id            : int
            metric_name   : str
            display_name  : str
            value         : float | None
            previous_value: float | None
            status        : str  ("ok" | "warning" | "alert")
            previous_status : str
            changed       : bool   – True if status flipped
            error         : str | None
        """
        items = self.memory.get_focus_items(active_only=True)

        if not items:
            logger.info("No active focus items to check")
            return []

        await self._broadcast(
            "thinking",
            f"Checking {len(items)} focus item(s)...",
        )

        results: list[dict[str, Any]] = []

        for item in items:
            result = await self._check_single_item(item)
            results.append(result)

            # Broadcast if status changed
            if result.get("changed"):
                new_status = result["status"]
                display = result["display_name"]
                value = result.get("value")

                if new_status == "alert":
                    msg = f"ALERT: {display} is at {value} — needs attention"
                elif new_status == "warning":
                    msg = f"Warning: {display} is at {value} — approaching threshold"
                else:
                    msg = f"{display} is back to normal at {value}"

                await self._broadcast(
                    "found_insight",
                    msg,
                    {"metric_name": item.metric_name, "status": new_status},
                )

        # Summary
        alerts = [r for r in results if r.get("status") == "alert"]
        warnings = [r for r in results if r.get("status") == "warning"]
        errors = [r for r in results if r.get("error")]

        summary_parts = []
        if alerts:
            summary_parts.append(f"{len(alerts)} alert(s)")
        if warnings:
            summary_parts.append(f"{len(warnings)} warning(s)")
        if errors:
            summary_parts.append(f"{len(errors)} error(s)")

        if summary_parts:
            await self._broadcast(
                "found_insight",
                f"Focus check complete: {', '.join(summary_parts)}",
            )
        else:
            await self._broadcast(
                "found_insight",
                "All focus items looking good",
            )

        return results

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _check_single_item(self, item: Any) -> dict[str, Any]:
        """Evaluate a single focus item."""
        previous_status = item.status
        previous_value = item.current_value

        try:
            rows = self.warehouse.execute_query(item.query)

            if not rows:
                return {
                    "id": item.id,
                    "metric_name": item.metric_name,
                    "display_name": item.display_name,
                    "value": None,
                    "previous_value": previous_value,
                    "status": previous_status,
                    "previous_status": previous_status,
                    "changed": False,
                    "error": "Query returned no results",
                }

            # Expect a single numeric value in the first row
            first_row = rows[0]
            value = float(list(first_row.values())[0])
            new_status = self._evaluate_status(value, item)

            # Persist the update
            self.memory.update_focus_item(
                item.id,
                current_value=value,
                status=new_status,
                last_checked=datetime.now(timezone.utc),
            )

            return {
                "id": item.id,
                "metric_name": item.metric_name,
                "display_name": item.display_name,
                "value": value,
                "previous_value": previous_value,
                "status": new_status,
                "previous_status": previous_status,
                "changed": new_status != previous_status,
                "error": None,
            }

        except Exception as exc:
            logger.error(
                "Failed to check focus item '%s': %s", item.metric_name, exc
            )
            return {
                "id": item.id,
                "metric_name": item.metric_name,
                "display_name": item.display_name,
                "value": None,
                "previous_value": previous_value,
                "status": previous_status,
                "previous_status": previous_status,
                "changed": False,
                "error": str(exc),
            }

    @staticmethod
    def _evaluate_status(value: float, item: Any) -> str:
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

    async def _broadcast(
        self, event_type: str, content: str, metadata: dict[str, Any] | None = None
    ) -> None:
        try:
            await self.broadcaster.broadcast(
                ThoughtEvent(
                    type=event_type,
                    content=content,
                    metadata=metadata or {},
                )
            )
        except Exception:
            logger.debug("Failed to broadcast thought event", exc_info=True)
