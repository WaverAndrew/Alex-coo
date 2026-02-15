"""Deep Dive Agent — runs multi-phase background research.

Unlike the quick analyst, this agent:
1. Plans a research strategy (5-10 queries)
2. Gathers data across multiple dimensions
3. Runs statistical analysis
4. Generates comprehensive charts
5. Synthesizes a structured report

Takes 1-3 minutes. Progress is broadcast via WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import anthropic

from backend.app.agents.analyst import AnalystAgent, ChartConfig
from backend.app.agents.persona import build_system_prompt
from backend.app.config import Settings
from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster, ThoughtEvent

logger = logging.getLogger(__name__)

DEEP_DIVE_SYSTEM = """\
You are Alex, COO of Bella Casa Furniture, conducting a DEEP DIVE analysis.

This is NOT a quick chat response. You are producing a comprehensive research report.
Take your time. Run many queries. Cross-reference data. Look for patterns.

PHASE INSTRUCTIONS:
When asked to PLAN: Output a JSON array of 8-15 SQL queries you want to run, each with a
"purpose" field explaining what it investigates. Be thorough — cover multiple angles.

When asked to ANALYZE: You have all the query results. Find patterns, correlations,
anomalies. Think like a management consultant.

When asked to REPORT: Write a structured report with these sections:
## Executive Summary
(2-3 sentences — the key takeaway)

## Key Findings
(Numbered findings, each with a bold title and data-backed explanation)

## Statistical Analysis
(Any regression results, correlations, trend analysis)

## Recommendations
(Concrete action items with expected impact)

## Risk Factors
(What could go wrong, what to watch)

Use **bold** for all key metrics. Reference charts by mentioning them.
Use recommend_chart for 4-6 visualizations covering different angles.
"""


class DeepDiveAgent:
    """Runs a multi-phase deep research analysis as a background task."""

    def __init__(
        self,
        warehouse: DuckDBWarehouse,
        broadcaster: ThoughtBroadcaster,
        settings: Settings,
    ):
        self.warehouse = warehouse
        self.broadcaster = broadcaster
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.MODEL_NAME
        self.schema = warehouse.get_schema()

    async def run(self, topic: str, dive_id: str) -> dict[str, Any]:
        """Execute the full deep dive pipeline. Returns the completed report."""
        start = time.time()

        try:
            # Phase 1: Plan
            await self._broadcast("deep_dive_progress", f"Planning research strategy for: {topic}",
                                  {"dive_id": dive_id, "phase": "plan", "progress": 10})
            plan = await self._phase_plan(topic)

            # Phase 2: Gather
            await self._broadcast("deep_dive_progress", f"Gathering data — {len(plan)} queries planned",
                                  {"dive_id": dive_id, "phase": "gather", "progress": 20})
            data_context = await self._phase_gather(plan, dive_id)

            # Phase 3: Analyze
            await self._broadcast("deep_dive_progress", "Cross-referencing findings and running analysis...",
                                  {"dive_id": dive_id, "phase": "analyze", "progress": 60})

            # Phase 4 + 5: Report with charts
            await self._broadcast("deep_dive_progress", "Synthesizing report and generating visualizations...",
                                  {"dive_id": dive_id, "phase": "report", "progress": 80})
            result = await self._phase_report(topic, data_context)

            elapsed = time.time() - start
            await self._broadcast("deep_dive_complete",
                                  f"Deep dive complete — {len(result['charts'])} charts, {elapsed:.0f}s",
                                  {"dive_id": dive_id, "progress": 100})

            return {
                "dive_id": dive_id,
                "title": result.get("title", topic),
                "content": result["content"],
                "charts": result["charts"],
                "queries_run": len(plan),
                "elapsed_seconds": round(elapsed, 1),
            }

        except Exception as exc:
            logger.exception("Deep dive failed: %s", exc)
            await self._broadcast("deep_dive_error", f"Deep dive failed: {str(exc)[:200]}",
                                  {"dive_id": dive_id})
            return {
                "dive_id": dive_id,
                "title": topic,
                "content": f"The deep dive encountered an error: {str(exc)[:500]}",
                "charts": [],
                "queries_run": 0,
                "elapsed_seconds": 0,
            }

    async def _phase_plan(self, topic: str) -> list[dict[str, str]]:
        """Phase 1: Claude plans 8-15 queries."""
        schema_text = "\n".join(
            f"- {t['table_name']}: {', '.join(c['name'] for c in t['columns'])}"
            for t in self.schema
        )

        response = await asyncio.to_thread(
            self.client.messages.create,
            model=self.model,
            max_tokens=4096,
            system=f"{DEEP_DIVE_SYSTEM}\n\nDATABASE SCHEMA:\n{schema_text}",
            messages=[{
                "role": "user",
                "content": (
                    f"PHASE: PLAN\n\nTopic: {topic}\n\n"
                    "Output a JSON array of queries to run. Each object should have:\n"
                    '- "sql": the DuckDB SQL query\n'
                    '- "purpose": what this query investigates\n\n'
                    "Plan 8-15 queries covering multiple angles. Be thorough.\n"
                    "Output ONLY the JSON array, no other text."
                ),
            }],
        )

        raw = response.content[0].text.strip()
        # Extract JSON from response
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            queries = json.loads(raw)
            if isinstance(queries, list):
                return queries[:15]
        except json.JSONDecodeError:
            logger.warning("Failed to parse plan JSON, using fallback")

        # Fallback: basic queries
        return [
            {"sql": f"SELECT * FROM sales_orders LIMIT 5", "purpose": "Sample sales data"},
            {"sql": f"SELECT COUNT(*) as cnt FROM sales_orders", "purpose": "Total orders"},
        ]

    async def _phase_gather(self, plan: list[dict[str, str]], dive_id: str) -> str:
        """Phase 2: Execute all planned queries and build data context."""
        results = []

        for i, query in enumerate(plan):
            sql = query.get("sql", "")
            purpose = query.get("purpose", f"Query {i+1}")

            await self._broadcast("deep_dive_progress",
                                  f"Running query {i+1}/{len(plan)}: {purpose}",
                                  {"dive_id": dive_id, "phase": "gather",
                                   "progress": 20 + int(40 * (i + 1) / len(plan))})

            try:
                rows = await asyncio.to_thread(self.warehouse.execute_query, sql)
                truncated = rows[:100]
                results.append(f"### Query {i+1}: {purpose}\n```sql\n{sql}\n```\nResults ({len(rows)} rows):\n{json.dumps(truncated[:20], default=str)}")
            except Exception as exc:
                results.append(f"### Query {i+1}: {purpose}\nERROR: {str(exc)[:200]}")

            # Small delay to avoid overwhelming the system
            await asyncio.sleep(0.1)

        return "\n\n".join(results)

    async def _phase_report(self, topic: str, data_context: str) -> dict[str, Any]:
        """Phase 3-5: Analyze, visualize, and produce the final report."""
        schema_text = "\n".join(
            f"- {t['table_name']}: {', '.join(c['name'] for c in t['columns'])}"
            for t in self.schema
        )

        # Use the analyst's tool-use loop for chart generation
        tools = [
            {
                "name": "recommend_chart",
                "description": "Add a chart to the report.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "chart_type": {"type": "string", "enum": ["bar", "line", "area", "pie", "metric", "geo"]},
                        "title": {"type": "string"},
                        "data": {"type": "array", "items": {"type": "object"}},
                        "x_key": {"type": "string"},
                        "y_keys": {"type": "array", "items": {"type": "string"}},
                        "colors": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["chart_type", "title", "data", "x_key", "y_keys"],
                },
            },
        ]

        messages = [{
            "role": "user",
            "content": (
                f"PHASE: REPORT\n\nTopic: {topic}\n\n"
                f"Here is ALL the data gathered from {len(data_context.split('### Query'))-1} queries:\n\n"
                f"{data_context}\n\n"
                "Now write a comprehensive structured report. Use recommend_chart for 4-6 visualizations.\n"
                "Include statistical analysis where relevant (trends, correlations, regression-like insights).\n"
                "Start with a clear title for this deep dive."
            ),
        }]

        charts: list[ChartConfig] = []
        narrative_parts: list[str] = []

        # Tool-use loop
        for turn in range(12):
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=8192,
                system=f"{DEEP_DIVE_SYSTEM}\n\nSCHEMA:\n{schema_text}",
                tools=tools,
                messages=messages,
            )

            tool_results = []
            for block in response.content:
                if block.type == "text" and block.text.strip():
                    narrative_parts.append(block.text)
                elif block.type == "tool_use" and block.name == "recommend_chart":
                    inp = block.input
                    chart = ChartConfig(
                        chart_type=inp.get("chart_type", "bar"),
                        title=inp.get("title", "Chart"),
                        data=inp.get("data", []),
                        x_key=inp.get("x_key", ""),
                        y_keys=inp.get("y_keys", []),
                        colors=inp.get("colors", []),
                    )
                    charts.append(chart)

                    await self._broadcast("deep_dive_progress",
                                          f"Generated chart: {chart.title}",
                                          {"phase": "report", "progress": 85})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"success": True, "chart_index": len(charts)}),
                    })

            if tool_results:
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
            else:
                break

            if response.stop_reason == "end_turn":
                break

        content = "\n\n".join(narrative_parts)

        # Extract title from first heading
        title = topic
        for line in content.split("\n"):
            clean = line.strip().lstrip("#").strip()
            if clean and len(clean) > 5:
                title = clean[:80]
                break

        chart_dicts = [
            {"type": c.chart_type, "title": c.title, "data": c.data,
             "xKey": c.x_key, "yKeys": c.y_keys, "colors": c.colors}
            for c in charts
        ]

        return {"title": title, "content": content, "charts": chart_dicts}

    async def _broadcast(self, event_type: str, content: str, metadata: dict | None = None):
        try:
            await self.broadcaster.broadcast(
                ThoughtEvent(type=event_type, content=content, metadata=metadata or {})
            )
        except Exception:
            pass
