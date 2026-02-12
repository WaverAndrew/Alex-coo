from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Session, SQLModel, create_engine, select

from backend.app.memory.models import (
    CompanyProfile,
    ConversationTurn,
    Dashboard,
    FocusItem,
    MetricSnapshot,
    Report,
)

logger = logging.getLogger(__name__)

_SQLITE_URL = "sqlite:///backend/data/memory.db"


class MemoryStore:
    """Persistent store backed by SQLite via SQLModel."""

    def __init__(self, db_url: str = _SQLITE_URL) -> None:
        self.engine = create_engine(db_url, echo=False)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def init_db(self) -> None:
        """Create all tables if they do not exist."""
        SQLModel.metadata.create_all(self.engine)
        logger.info("Memory store tables initialised")

    # ------------------------------------------------------------------
    # Conversations
    # ------------------------------------------------------------------

    def save_conversation_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        chart_configs: list[dict[str, Any]] | None = None,
    ) -> ConversationTurn:
        turn = ConversationTurn(
            session_id=session_id,
            role=role,
            content=content,
        )
        if chart_configs:
            turn.set_chart_configs(chart_configs)

        with Session(self.engine) as session:
            session.add(turn)
            session.commit()
            session.refresh(turn)
        return turn

    def get_conversation_history(
        self, session_id: str, limit: int = 20
    ) -> list[ConversationTurn]:
        with Session(self.engine) as session:
            statement = (
                select(ConversationTurn)
                .where(ConversationTurn.session_id == session_id)
                .order_by(ConversationTurn.timestamp.desc())
                .limit(limit)
            )
            results = session.exec(statement).all()
        return list(reversed(results))  # oldest first

    # ------------------------------------------------------------------
    # Dashboards
    # ------------------------------------------------------------------

    def save_dashboard(
        self,
        title: str,
        description: str | None = None,
        chart_configs: list[dict[str, Any]] | None = None,
        pinned: bool = False,
    ) -> Dashboard:
        dashboard = Dashboard(
            title=title,
            description=description,
            pinned=pinned,
        )
        if chart_configs:
            dashboard.set_chart_configs(chart_configs)

        with Session(self.engine) as session:
            session.add(dashboard)
            session.commit()
            session.refresh(dashboard)
        return dashboard

    def get_dashboards(self) -> list[Dashboard]:
        with Session(self.engine) as session:
            statement = select(Dashboard).order_by(Dashboard.created_at.desc())
            return list(session.exec(statement).all())

    def get_dashboard(self, dashboard_id: int) -> Dashboard | None:
        with Session(self.engine) as session:
            return session.get(Dashboard, dashboard_id)

    def update_dashboard(self, dashboard_id: int, **kwargs: Any) -> Dashboard | None:
        with Session(self.engine) as session:
            dashboard = session.get(Dashboard, dashboard_id)
            if dashboard is None:
                return None
            for key, value in kwargs.items():
                if key == "chart_configs" and isinstance(value, list):
                    dashboard.set_chart_configs(value)
                elif hasattr(dashboard, key):
                    setattr(dashboard, key, value)
            session.add(dashboard)
            session.commit()
            session.refresh(dashboard)
        return dashboard

    def delete_dashboard(self, dashboard_id: int) -> bool:
        with Session(self.engine) as session:
            dashboard = session.get(Dashboard, dashboard_id)
            if dashboard is None:
                return False
            session.delete(dashboard)
            session.commit()
        return True

    # ------------------------------------------------------------------
    # Focus items
    # ------------------------------------------------------------------

    def save_focus_item(
        self,
        metric_name: str,
        display_name: str,
        query: str,
        threshold_warning: float | None = None,
        threshold_alert: float | None = None,
        direction: str = "higher_is_better",
    ) -> FocusItem:
        item = FocusItem(
            metric_name=metric_name,
            display_name=display_name,
            query=query,
            threshold_warning=threshold_warning,
            threshold_alert=threshold_alert,
            direction=direction,
        )
        with Session(self.engine) as session:
            session.add(item)
            session.commit()
            session.refresh(item)
        return item

    def get_focus_items(self, active_only: bool = True) -> list[FocusItem]:
        with Session(self.engine) as session:
            statement = select(FocusItem)
            if active_only:
                statement = statement.where(FocusItem.active == True)  # noqa: E712
            return list(session.exec(statement).all())

    def update_focus_item(self, item_id: int, **kwargs: Any) -> FocusItem | None:
        with Session(self.engine) as session:
            item = session.get(FocusItem, item_id)
            if item is None:
                return None
            for key, value in kwargs.items():
                if hasattr(item, key):
                    setattr(item, key, value)
            session.add(item)
            session.commit()
            session.refresh(item)
        return item

    def delete_focus_item(self, item_id: int) -> bool:
        with Session(self.engine) as session:
            item = session.get(FocusItem, item_id)
            if item is None:
                return False
            session.delete(item)
            session.commit()
        return True

    # ------------------------------------------------------------------
    # Company profile
    # ------------------------------------------------------------------

    def save_company_profile(
        self,
        name: str,
        industry: str | None = None,
        description: str | None = None,
        key_metrics: list[dict[str, Any]] | None = None,
    ) -> CompanyProfile:
        with Session(self.engine) as session:
            # Upsert: keep only one profile
            existing = session.exec(select(CompanyProfile)).first()
            if existing:
                existing.name = name
                existing.industry = industry
                existing.description = description
                if key_metrics:
                    existing.set_key_metrics(key_metrics)
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return existing

            profile = CompanyProfile(
                name=name,
                industry=industry,
                description=description,
            )
            if key_metrics:
                profile.set_key_metrics(key_metrics)
            session.add(profile)
            session.commit()
            session.refresh(profile)
        return profile

    def get_company_profile(self) -> CompanyProfile | None:
        with Session(self.engine) as session:
            return session.exec(select(CompanyProfile)).first()
