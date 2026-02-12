from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Conversation
# ---------------------------------------------------------------------------

class ConversationTurn(SQLModel, table=True):
    __tablename__ = "conversation_turns"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    role: str  # "user" | "assistant"
    content: str
    chart_configs: Optional[str] = Field(default=None)  # JSON string
    timestamp: datetime = Field(default_factory=_utcnow)

    # ------ convenience helpers ------

    def get_chart_configs(self) -> list[dict[str, Any]]:
        if self.chart_configs:
            return json.loads(self.chart_configs)
        return []

    def set_chart_configs(self, configs: list[dict[str, Any]]) -> None:
        self.chart_configs = json.dumps(configs)


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    chart_configs: Optional[str] = Field(default=None)  # JSON string
    sql_queries: Optional[str] = Field(default=None)     # JSON string
    created_at: datetime = Field(default_factory=_utcnow)


# ---------------------------------------------------------------------------
# Dashboards
# ---------------------------------------------------------------------------

class Dashboard(SQLModel, table=True):
    __tablename__ = "dashboards"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    chart_configs: Optional[str] = Field(default=None)  # JSON string
    pinned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow)

    def get_chart_configs(self) -> list[dict[str, Any]]:
        if self.chart_configs:
            return json.loads(self.chart_configs)
        return []

    def set_chart_configs(self, configs: list[dict[str, Any]]) -> None:
        self.chart_configs = json.dumps(configs)


# ---------------------------------------------------------------------------
# Metric snapshots
# ---------------------------------------------------------------------------

class MetricSnapshot(SQLModel, table=True):
    __tablename__ = "metric_snapshots"

    id: Optional[int] = Field(default=None, primary_key=True)
    metric_name: str = Field(index=True)
    value: float
    timestamp: datetime = Field(default_factory=_utcnow)
    context: Optional[str] = None


# ---------------------------------------------------------------------------
# Focus items  (the COO's "watch list")
# ---------------------------------------------------------------------------

class FocusItem(SQLModel, table=True):
    __tablename__ = "focus_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    metric_name: str = Field(index=True)
    display_name: str
    query: str  # SQL to evaluate the metric
    threshold_warning: Optional[float] = None
    threshold_alert: Optional[float] = None
    direction: str = "higher_is_better"  # "higher_is_better" | "lower_is_better"
    status: str = "ok"  # "ok" | "warning" | "alert"
    current_value: Optional[float] = None
    last_checked: Optional[datetime] = None
    active: bool = Field(default=True)


# ---------------------------------------------------------------------------
# Company profile
# ---------------------------------------------------------------------------

class CompanyProfile(SQLModel, table=True):
    __tablename__ = "company_profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    key_metrics: Optional[str] = Field(default=None)  # JSON string

    def get_key_metrics(self) -> list[dict[str, Any]]:
        if self.key_metrics:
            return json.loads(self.key_metrics)
        return []

    def set_key_metrics(self, metrics: list[dict[str, Any]]) -> None:
        self.key_metrics = json.dumps(metrics)
