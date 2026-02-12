"""Dashboard builder — converts analysis results into saveable dashboard configs.

Wraps the MemoryStore's dashboard persistence with a higher-level API
that the orchestrator can use after an analysis run.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.app.memory.store import MemoryStore

logger = logging.getLogger(__name__)


class DashboardBuilder:
    """Creates and manages dashboards from analysis outputs."""

    def __init__(self, memory_store: MemoryStore) -> None:
        self.memory = memory_store

    async def create_from_analysis(
        self,
        title: str,
        charts: list[dict[str, Any]],
        narrative: str,
    ) -> dict[str, Any]:
        """Persist a new dashboard built from analysis results.

        Parameters
        ----------
        title : str
            Dashboard title.
        charts : list[dict]
            List of ChartConfig dicts (type, title, data, xKey, yKeys, colors).
        narrative : str
            The narrative text that accompanies the charts.

        Returns
        -------
        dict with the saved dashboard's fields (id, title, description, etc.).
        """
        # Use the narrative (truncated) as the dashboard description
        description = narrative[:500] if narrative else None

        dashboard = self.memory.save_dashboard(
            title=title,
            description=description,
            chart_configs=charts,
            pinned=False,
        )

        logger.info(
            "Dashboard created: id=%s, title='%s', charts=%d",
            dashboard.id,
            dashboard.title,
            len(charts),
        )

        return {
            "id": dashboard.id,
            "title": dashboard.title,
            "description": dashboard.description,
            "chart_configs": dashboard.get_chart_configs(),
            "pinned": dashboard.pinned,
            "created_at": dashboard.created_at.isoformat(),
        }

    async def add_charts_to_dashboard(
        self,
        dashboard_id: int,
        new_charts: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Append charts to an existing dashboard.

        Returns the updated dashboard dict or None if not found.
        """
        dashboard = self.memory.get_dashboard(dashboard_id)
        if dashboard is None:
            return None

        existing_charts = dashboard.get_chart_configs()
        combined = existing_charts + new_charts

        updated = self.memory.update_dashboard(
            dashboard_id,
            chart_configs=combined,
        )

        if updated is None:
            return None

        return {
            "id": updated.id,
            "title": updated.title,
            "description": updated.description,
            "chart_configs": updated.get_chart_configs(),
            "pinned": updated.pinned,
            "created_at": updated.created_at.isoformat(),
        }
