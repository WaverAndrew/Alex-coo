"""Core analyst agent — the brain of Alex.

Uses Claude's tool-use API to iteratively query the data warehouse,
interpret results, and produce a narrative response with optional chart
configurations.
"""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone
from typing import Any, Optional

import anthropic
from pydantic import BaseModel, Field

from backend.app.agents.persona import build_system_prompt
from backend.app.config import Settings
from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster, ThoughtEvent

logger = logging.getLogger(__name__)

# Maximum tool-use iterations before we force the model to wrap up
_MAX_ITERATIONS = 10

# Maximum rows returned from a single SQL query to avoid blowing up context
_MAX_RESULT_ROWS = 500


# ======================================================================
# Result models
# ======================================================================

class ChartConfig(BaseModel):
    """A single chart configuration, Recharts-compatible."""

    chart_type: str  # bar, line, area, pie, metric
    title: str
    data: list[dict[str, Any]]
    x_key: str
    y_keys: list[str]
    colors: list[str] = Field(default_factory=list)
    format: str = ""  # currency, percent, number


class AnalysisResult(BaseModel):
    """The complete result of an analyst run."""

    narrative: str  # Markdown formatted response
    charts: list[ChartConfig] = Field(default_factory=list)
    sql_queries: list[str] = Field(default_factory=list)
    confidence: str = "high"  # high / medium / low


# ======================================================================
# Tool definitions (Claude tool-use schema)
# ======================================================================

TOOLS: list[dict[str, Any]] = [
    {
        "name": "execute_sql",
        "description": (
            "Execute a SQL query against the DuckDB data warehouse and return "
            "the results as a JSON array of objects. Use standard DuckDB SQL "
            "syntax. The query must be read-only (SELECT only)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "The SQL query to execute. Must be a SELECT statement.",
                },
            },
            "required": ["sql"],
        },
    },
    {
        "name": "recommend_chart",
        "description": (
            "Recommend a chart visualization to include in the response. "
            "Call this after you have fetched the data you want to display. "
            "The data must be an array of flat objects suitable for Recharts."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "area", "pie", "metric", "geo"],
                    "description": (
                        "The type of chart. Use 'geo' for geographic supply chain maps — "
                        "pass data as array of {name, lat, lng, status, category, on_time_pct}. "
                        "status should be 'on-time', 'delayed', or 'critical'. "
                        "The suppliers table has lat/lng columns."
                    ),
                },
                "title": {
                    "type": "string",
                    "description": "A short, descriptive title for the chart.",
                },
                "data": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": (
                        "Array of data point objects. Each object should have "
                        "keys matching x_key and y_keys. Values should be "
                        "strings for labels and numbers for values."
                    ),
                },
                "x_key": {
                    "type": "string",
                    "description": "The key in each data object to use for the x-axis.",
                },
                "y_keys": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of keys to use for the y-axis values.",
                },
                "colors": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Optional list of hex color codes for each y_key. "
                        "E.g. ['#3b82f6', '#ef4444']."
                    ),
                },
                "format": {
                    "type": "string",
                    "enum": ["currency", "percent", "number", ""],
                    "description": (
                        "Optional format hint for the y-axis values. "
                        "'currency' for EUR amounts, 'percent' for percentages, "
                        "'number' for plain numbers."
                    ),
                },
            },
            "required": ["chart_type", "title", "data", "x_key", "y_keys"],
        },
    },
]


# ======================================================================
# AnalystAgent
# ======================================================================

class AnalystAgent:
    """Runs a multi-turn tool-use loop with Claude to answer data questions."""

    def __init__(
        self,
        warehouse: DuckDBWarehouse,
        memory_store: MemoryStore,
        thought_broadcaster: ThoughtBroadcaster,
        settings: Settings,
    ) -> None:
        self.warehouse = warehouse
        self.memory = memory_store
        self.broadcaster = thought_broadcaster
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.MODEL_NAME

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def analyze(
        self,
        question: str,
        session_id: str,
        company_profile: dict[str, Any] | None = None,
        focus_items: list[dict[str, Any]] | None = None,
    ) -> AnalysisResult:
        """Run the full analysis loop and return the structured result.

        Returns an AnalysisResult with narrative, charts, sql_queries, and
        confidence level.
        """

        # 1. Gather context --------------------------------------------------
        schema_info = self.warehouse.get_schema()

        recent_turns = self.memory.get_conversation_history(session_id, limit=10)
        recent_history = [
            {"role": t.role, "content": t.content} for t in recent_turns
        ]

        system_prompt = build_system_prompt(
            company_profile=company_profile,
            schema_info=schema_info,
            focus_items=focus_items,
            recent_history=recent_history,
        )

        # 2. Seed the messages list with the user question --------------------
        messages: list[dict[str, Any]] = [
            {"role": "user", "content": question},
        ]

        # Accumulators
        charts: list[ChartConfig] = []
        sql_queries: list[str] = []
        narrative = ""
        confidence = "high"

        # 3. Tool-use loop ----------------------------------------------------
        await self._broadcast(
            "thinking",
            f"Analyzing: \"{question}\"",
            {"session_id": session_id},
        )

        for iteration in range(1, _MAX_ITERATIONS + 1):
            logger.info("Analyst iteration %d / %d", iteration, _MAX_ITERATIONS)

            # The Anthropic client is synchronous — run in a thread to avoid
            # blocking the event loop.
            try:
                response = await asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt,
                    tools=TOOLS,
                    messages=messages,
                )
            except anthropic.APIError as exc:
                logger.error("Anthropic API error: %s", exc)
                await self._broadcast(
                    "error",
                    f"API error: {exc}",
                    {"session_id": session_id},
                )
                narrative = (
                    "I ran into a problem reaching our analysis engine. "
                    "Give me a moment and let's try that again."
                )
                confidence = "low"
                break

            # ---- Process the response content blocks ----
            tool_use_blocks: list[dict[str, Any]] = []
            text_blocks: list[str] = []

            for block in response.content:
                if block.type == "text":
                    text_blocks.append(block.text)
                elif block.type == "tool_use":
                    tool_use_blocks.append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })

            # Capture any text produced alongside tool calls
            if text_blocks:
                narrative = "\n\n".join(text_blocks)

            # If no tool calls, we're done
            if response.stop_reason == "end_turn" or not tool_use_blocks:
                await self._broadcast(
                    "found_insight",
                    "Analysis complete",
                    {"session_id": session_id},
                )
                break

            # ---- Execute tool calls and build tool_result messages ----
            # Append the assistant message with the raw content blocks
            messages.append({"role": "assistant", "content": response.content})

            tool_results: list[dict[str, Any]] = []

            for tool_call in tool_use_blocks:
                tool_name = tool_call["name"]
                tool_input = tool_call["input"]
                tool_id = tool_call["id"]

                if tool_name == "execute_sql":
                    result_content = await self._handle_execute_sql(
                        tool_input, sql_queries, session_id
                    )
                elif tool_name == "recommend_chart":
                    result_content = await self._handle_recommend_chart(
                        tool_input, charts, session_id
                    )
                else:
                    result_content = json.dumps({"error": f"Unknown tool: {tool_name}"})

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": result_content,
                })

            messages.append({"role": "user", "content": tool_results})
        else:
            # Loop exhausted without a natural stop — ask Claude to wrap up
            logger.warning("Max iterations reached, forcing wrap-up")
            await self._broadcast(
                "thinking",
                "Wrapping up analysis...",
                {"session_id": session_id},
            )
            messages.append({
                "role": "user",
                "content": (
                    "You've run many queries. Please wrap up your analysis now "
                    "and give me your final narrative with the data you have."
                ),
            })
            try:
                final_response = await asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=messages,
                )
                for block in final_response.content:
                    if block.type == "text":
                        narrative = block.text
                        break
            except Exception:
                logger.exception("Failed to get wrap-up response")
            confidence = "medium"

        # 4. Determine confidence based on query success ----------------------
        if not sql_queries:
            confidence = "low"
        elif any(c.chart_type == "metric" for c in charts) and len(sql_queries) >= 2:
            confidence = "high"

        # 5. Return structured result -----------------------------------------
        return AnalysisResult(
            narrative=narrative,
            charts=charts,
            sql_queries=sql_queries,
            confidence=confidence,
        )

    # ------------------------------------------------------------------
    # Tool handlers
    # ------------------------------------------------------------------

    async def _handle_execute_sql(
        self,
        tool_input: dict[str, Any],
        sql_queries: list[str],
        session_id: str,
    ) -> str:
        """Execute a SQL query and return the result as a JSON string."""
        sql = tool_input.get("sql", "")
        sql_queries.append(sql)

        # Broadcast the SQL being executed
        await self._broadcast(
            "executing_sql",
            f"Running query: {sql[:200]}{'...' if len(sql) > 200 else ''}",
            {"session_id": session_id, "sql": sql},
        )

        try:
            # DuckDB operations are synchronous — run in thread
            rows = await asyncio.to_thread(self.warehouse.execute_query, sql)

            # Truncate if too many rows
            truncated = False
            if len(rows) > _MAX_RESULT_ROWS:
                rows = rows[:_MAX_RESULT_ROWS]
                truncated = True

            # Convert values that aren't JSON-serializable
            clean_rows = _make_json_safe(rows)

            result = {
                "success": True,
                "row_count": len(clean_rows),
                "truncated": truncated,
                "data": clean_rows,
            }

            logger.info(
                "SQL returned %d row(s)%s",
                len(clean_rows),
                " (truncated)" if truncated else "",
            )
            return json.dumps(result, default=str)

        except Exception as exc:
            error_msg = str(exc)
            logger.warning("SQL execution failed: %s", error_msg)

            await self._broadcast(
                "error",
                f"Query error — retrying: {error_msg[:150]}",
                {"session_id": session_id, "sql": sql, "error": error_msg},
            )

            result = {
                "success": False,
                "error": error_msg,
                "hint": (
                    "Check the table and column names against the schema. "
                    "Use DuckDB SQL syntax. Common issues: wrong column names, "
                    "missing quotes around string literals, or using MySQL/Postgres "
                    "syntax instead of DuckDB."
                ),
            }
            return json.dumps(result)

    async def _handle_recommend_chart(
        self,
        tool_input: dict[str, Any],
        charts: list[ChartConfig],
        session_id: str,
    ) -> str:
        """Store a chart configuration and return a confirmation."""
        chart = ChartConfig(
            chart_type=tool_input.get("chart_type", "bar"),
            title=tool_input.get("title", "Chart"),
            data=tool_input.get("data", []),
            x_key=tool_input.get("x_key", ""),
            y_keys=tool_input.get("y_keys", []),
            colors=tool_input.get("colors", []),
            format=tool_input.get("format", ""),
        )

        charts.append(chart)

        await self._broadcast(
            "generating_chart",
            f"Creating chart: {chart.title}",
            {"session_id": session_id, "chart_type": chart.chart_type},
        )

        logger.info("Chart recommended: %s (%s)", chart.title, chart.chart_type)
        return json.dumps({
            "success": True,
            "message": f"Chart '{chart.title}' registered. Reference it in your narrative.",
        })

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _broadcast(
        self, event_type: str, content: str, metadata: dict[str, Any] | None = None
    ) -> None:
        """Broadcast a thought event, swallowing errors so analysis continues."""
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


# ======================================================================
# Helpers
# ======================================================================

def _make_json_safe(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert non-serializable values (dates, Decimals, etc.) to strings."""
    safe: list[dict[str, Any]] = []
    for row in rows:
        clean = {}
        for key, value in row.items():
            if isinstance(value, (datetime,)):
                clean[key] = value.isoformat()
            elif isinstance(value, (bytes, bytearray)):
                clean[key] = value.decode("utf-8", errors="replace")
            elif value is None:
                clean[key] = None
            elif isinstance(value, (int, float, str, bool)):
                clean[key] = value
            else:
                clean[key] = str(value)
        safe.append(clean)
    return safe
