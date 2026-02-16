"""Orchestrator — classifies user intent and routes to the right handler.

Uses a fast Claude call for intent classification, then dispatches to:
- AnalystAgent for data analysis questions
- DashboardBuilder for dashboard creation requests
- Quick in-character responses for chitchat
- Focus item management for monitoring requests
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import anthropic

from backend.app.agents.analyst import AnalystAgent, AnalysisResult, ChartConfig
from backend.app.agents.dashboard_builder import DashboardBuilder
from backend.app.agents.deep_dive_agent import DeepDiveAgent
from backend.app.config import Settings
from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster, ThoughtEvent

logger = logging.getLogger(__name__)


# ======================================================================
# Intent classification
# ======================================================================

class Intent:
    ANALYSIS = "analysis"
    DASHBOARD = "dashboard"
    FOCUS = "focus"
    FORECAST = "forecast"
    CHITCHAT = "chitchat"
    DEEP_DIVE = "deep_dive"


_INTENT_PROMPT = """\
You are an intent classifier for a business intelligence assistant. Classify the \
user's message into exactly ONE of these categories:

- ANALYSIS: The user is asking a question about data, metrics, performance, trends, \
comparisons, or wants to understand some aspect of the business. This is the most \
common intent. Examples: "How are sales this month?", "Which products sell best?", \
"Show me revenue by channel", "What's our defect rate?"

- DASHBOARD: The user explicitly wants to create, build, or save a dashboard. \
They must use words like "dashboard" or "save this as a dashboard". Examples: \
"Create a dashboard of our sales KPIs", "Build me a revenue dashboard".

- FOCUS: The user wants to set up monitoring/alerts for a specific metric. They \
use words like "watch", "monitor", "track", "alert", "focus on". Examples: \
"Monitor our defect rate", "Set an alert if revenue drops below 50k".

- FORECAST: The user is asking about predictions, forecasts, or future projections. \
Examples: "What will revenue be next quarter?", "Forecast our growth".

- CHITCHAT: The user is greeting, thanking, asking who you are, or making small \
talk that doesn't require data analysis. Examples: "Hi", "Thanks", "Who are you?", \
"What can you do?"

Respond with ONLY the category name in uppercase. Nothing else."""


# Quick regex fallback for obvious cases (avoids an API call)
_CHITCHAT_PATTERNS = [
    r"^(hi|hello|hey|good\s+(morning|afternoon|evening)|what'?s?\s+up|howdy)\s*[!?.]*$",
    r"^(thanks|thank\s+you|cheers|ty)\s*[!?.]*$",
    r"^(who\s+are\s+you|what\s+can\s+you\s+do|what\s+do\s+you\s+do)\s*[?!.]*$",
]

_DASHBOARD_PATTERNS = [
    r"\b(create|build|make|save)\b.*\bdashboard\b",
    r"\bdashboard\b.*\b(create|build|make|save)\b",
]

_FOCUS_PATTERNS = [
    r"\b(watch|monitor|track|alert)\b.*\b(metric|rate|revenue|sales|defect)\b",
    r"\bset\s+(an?\s+)?alert\b",
    r"\badd\s+to\s+focus\b",
    r"\bfocus\s+on\b",
]

_DEEP_DIVE_PATTERNS = [
    r"\bdeep\s*dive\b",
    r"\bfull\s+analysis\b",
    r"\bthorough(ly)?\s+(investigate|analysis|research)\b",
    r"\bdetailed\s+report\b",
    r"\bcomprehensive\s+(analysis|report|study)\b",
    r"\binvestigate\s+.{5,}\s+(in\s+depth|thoroughly)\b",
    r"\bresearch\s+.{5,}\s+(in\s+depth|thoroughly)\b",
    r"\brun\s+a\s+(regression|statistical|ml)\b",
]


def _quick_classify(message: str) -> str | None:
    """Try regex-based classification for obvious cases. Returns None if unsure."""
    lower = message.strip().lower()

    for pattern in _CHITCHAT_PATTERNS:
        if re.match(pattern, lower):
            return Intent.CHITCHAT

    for pattern in _DASHBOARD_PATTERNS:
        if re.search(pattern, lower):
            return Intent.DASHBOARD

    for pattern in _FOCUS_PATTERNS:
        if re.search(pattern, lower):
            return Intent.FOCUS

    for pattern in _DEEP_DIVE_PATTERNS:
        if re.search(pattern, lower):
            return Intent.DEEP_DIVE

    return None


async def classify_intent(
    message: str,
    client: anthropic.Anthropic,
    model: str,
) -> str:
    """Classify intent using regex first, then Claude as fallback.

    Returns one of the Intent constants.
    """
    # Try fast regex classification first
    quick = _quick_classify(message)
    if quick is not None:
        logger.info("Intent classified via regex: %s", quick)
        return quick

    # Fall back to Claude for ambiguous messages
    try:
        response = await asyncio.to_thread(
            client.messages.create,
            model=model,
            max_tokens=20,
            system=_INTENT_PROMPT,
            messages=[{"role": "user", "content": message}],
        )
        raw = response.content[0].text.strip().upper()

        intent_map = {
            "ANALYSIS": Intent.ANALYSIS,
            "DASHBOARD": Intent.DASHBOARD,
            "FOCUS": Intent.FOCUS,
            "FORECAST": Intent.FORECAST,
            "CHITCHAT": Intent.CHITCHAT,
        }
        intent = intent_map.get(raw, Intent.ANALYSIS)
        logger.info("Intent classified via Claude: %s (raw: %s)", intent, raw)
        return intent

    except Exception as exc:
        logger.warning("Intent classification failed, defaulting to ANALYSIS: %s", exc)
        return Intent.ANALYSIS


# ======================================================================
# Chitchat responses
# ======================================================================

_CHITCHAT_RESPONSES = {
    "greeting": (
        "Hey! Alex here. I've got our data loaded and ready to go. "
        "What would you like to dig into today? I can run through our "
        "sales numbers, check on production, look at supplier performance "
        "-- whatever you need."
    ),
    "thanks": (
        "Happy to help! Let me know if there's anything else you want "
        "to look at. I've got all our numbers right here."
    ),
    "who": (
        "I'm Alex, COO of Bella Casa Furniture. Been here about three years now. "
        "I know our data inside and out -- sales, production, supply chain, the lot. "
        "Ask me anything about how we're performing and I'll pull the numbers."
    ),
    "capabilities": (
        "I can dig into pretty much anything in our data. Sales trends, "
        "product performance, customer segments, supplier reliability, "
        "production metrics, inventory levels -- you name it. I can also "
        "build dashboards and set up alerts on metrics you want to keep "
        "an eye on. What do you want to start with?"
    ),
}


def _get_chitchat_response(message: str) -> str:
    lower = message.strip().lower()
    if re.match(r"^(who\s+are\s+you)", lower):
        return _CHITCHAT_RESPONSES["who"]
    if re.match(r"^(what\s+can\s+you\s+do|what\s+do\s+you\s+do)", lower):
        return _CHITCHAT_RESPONSES["capabilities"]
    if re.match(r"^(thanks|thank\s+you|cheers|ty)", lower):
        return _CHITCHAT_RESPONSES["thanks"]
    return _CHITCHAT_RESPONSES["greeting"]


# ======================================================================
# Orchestrator
# ======================================================================

class Orchestrator:
    """Central dispatcher that classifies intent and coordinates agents."""

    def __init__(
        self,
        warehouse: DuckDBWarehouse,
        memory_store: MemoryStore,
        broadcaster: ThoughtBroadcaster,
        settings: Settings,
    ) -> None:
        self.warehouse = warehouse
        self.memory = memory_store
        self.broadcaster = broadcaster
        self.settings = settings

        # Build sub-agents
        self.analyst = AnalystAgent(
            warehouse=warehouse,
            memory_store=memory_store,
            thought_broadcaster=broadcaster,
            settings=settings,
        )
        self.dashboard_builder = DashboardBuilder(memory_store)

        # Anthropic client for intent classification
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.MODEL_NAME
        self.fast_model = settings.FAST_MODEL_NAME

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def process_message(
        self, message: str, session_id: str, context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Process a user message end-to-end and return the response payload.

        Parameters
        ----------
        context : dict | None
            Optional page context. When the user is viewing a dashboard:
            {"page": "dashboard", "dashboard": {"id": "1", "title": "...", "charts": [...]}}
            This lets the agent understand if the user wants to modify the current view.

        Returns
        -------
        dict with keys:
            session_id      : str
            content         : str   -- narrative text (markdown)
            chart_configs   : list  -- chart configuration objects
            dashboard_update: dict | None -- {action: "replace_all"|"add", charts: [...]}
            confidence      : str   -- high / medium / low
            intent          : str   -- classified intent
        """

        # Persist user turn
        self.memory.save_conversation_turn(
            session_id=session_id,
            role="user",
            content=message,
        )

        # If user is on a dashboard page, check if they want to edit it
        on_dashboard = context and context.get("page") == "dashboard" and context.get("dashboard")

        if on_dashboard:
            intent = Intent.DASHBOARD
            logger.info("Dashboard context detected — routing to dashboard edit (message: %s)", message[:80])
        else:
            intent = await classify_intent(message, self.client, self.fast_model)
            logger.info("Intent classified: %s (message: %s)", intent, message[:80])

        await self._broadcast(
            "thinking",
            "Looking at your dashboard..." if on_dashboard else "Understanding your question...",
            {"session_id": session_id, "intent": intent},
        )

        # Route
        try:
            if on_dashboard:
                result = await self._handle_dashboard_edit(message, session_id, context["dashboard"])

            elif intent == Intent.CHITCHAT:
                result = await self._handle_chitchat(message, session_id)

            elif intent == Intent.DASHBOARD:
                result = await self._handle_dashboard(message, session_id)

            elif intent == Intent.DEEP_DIVE:
                result = await self._handle_deep_dive(message, session_id)

            elif intent == Intent.FOCUS:
                result = await self._handle_analysis(message, session_id)

            elif intent == Intent.FORECAST:
                result = await self._handle_analysis(message, session_id)

            else:  # ANALYSIS (default)
                result = await self._handle_analysis(message, session_id)

        except Exception as exc:
            logger.exception("Error processing message")
            await self._broadcast(
                "error",
                f"Something went wrong: {str(exc)[:200]}",
                {"session_id": session_id},
            )
            result = {
                "session_id": session_id,
                "content": (
                    "I hit a snag trying to analyze that. Let me know if you "
                    "want to try rephrasing the question or if there's "
                    "something specific I should look at."
                ),
                "chart_configs": [],
                "confidence": "low",
                "intent": intent,
            }

        result["intent"] = intent

        # Persist assistant turn
        self.memory.save_conversation_turn(
            session_id=session_id,
            role="assistant",
            content=result["content"],
            chart_configs=result.get("chart_configs"),
        )

        return result

    # ------------------------------------------------------------------
    # Intent handlers
    # ------------------------------------------------------------------

    async def _handle_chitchat(
        self, message: str, session_id: str
    ) -> dict[str, Any]:
        response_text = _get_chitchat_response(message)
        await self._broadcast(
            "found_insight",
            response_text[:100],
            {"session_id": session_id},
        )
        return {
            "session_id": session_id,
            "content": response_text,
            "chart_configs": [],
            "confidence": "high",
        }

    async def _handle_analysis(
        self, message: str, session_id: str
    ) -> dict[str, Any]:
        # Gather company profile and focus items for context
        company_profile = self._get_company_profile_dict()
        focus_items = self._get_focus_items_dicts()

        result: AnalysisResult = await self.analyst.analyze(
            question=message,
            session_id=session_id,
            company_profile=company_profile,
            focus_items=focus_items,
        )

        # Convert ChartConfig models to Recharts-compatible dicts
        chart_dicts = [
            {
                "type": c.chart_type,
                "title": c.title,
                "data": c.data,
                "xKey": c.x_key,
                "yKeys": c.y_keys,
                "colors": c.colors,
                "format": c.format,
            }
            for c in result.charts
        ]

        return {
            "session_id": session_id,
            "content": result.narrative,
            "chart_configs": chart_dicts,
            "confidence": result.confidence,
        }

    async def _handle_dashboard(
        self, message: str, session_id: str
    ) -> dict[str, Any]:
        # First run analysis to get charts and narrative
        analysis = await self._handle_analysis(message, session_id)

        # If charts were produced, also save as a dashboard
        if analysis["chart_configs"]:
            title = _extract_dashboard_title(message)
            dashboard = await self.dashboard_builder.create_from_analysis(
                title=title,
                charts=analysis["chart_configs"],
                narrative=analysis["content"],
            )
            analysis["content"] += (
                f"\n\nI've saved this as a dashboard: **{dashboard['title']}**. "
                "You can find it in the Dashboards section."
            )
            analysis["dashboard_id"] = dashboard.get("id")

        return analysis

    async def _handle_dashboard_edit(
        self, message: str, session_id: str, dashboard_ctx: dict[str, Any]
    ) -> dict[str, Any]:
        """Handle a request to modify the currently viewed dashboard.

        The user is looking at a dashboard and wants to add/change/remove charts.
        We inject the current dashboard state into the analyst prompt so it understands
        the context, then return chart updates that the frontend applies in-place.
        """
        dashboard_title = dashboard_ctx.get("title", "Dashboard")
        existing_charts = dashboard_ctx.get("charts", [])

        # Build a context description of the current dashboard
        chart_descriptions = []
        for i, c in enumerate(existing_charts):
            chart_descriptions.append(
                f"  Chart {i+1}: {c.get('type', '?')} - \"{c.get('title', 'Untitled')}\" "
                f"(x={c.get('xKey', '?')}, y={c.get('yKeys', [])})"
            )
        dashboard_summary = (
            f"The user is currently viewing the \"{dashboard_title}\" dashboard "
            f"which has {len(existing_charts)} chart(s):\n"
            + "\n".join(chart_descriptions)
        )

        # Augment the message with dashboard context
        augmented_message = (
            f"{message}\n\n"
            f"[DASHBOARD CONTEXT: {dashboard_summary}]\n"
            f"[INSTRUCTION: The user is editing this dashboard. Generate new or replacement "
            f"charts using recommend_chart. If they ask to add something, create additional charts. "
            f"If they ask to change the view (e.g. 'show as line chart'), regenerate the relevant "
            f"chart with the new type. Always produce the charts via recommend_chart tool calls.]"
        )

        await self._broadcast(
            "thinking",
            f"Analyzing how to update \"{dashboard_title}\"...",
            {"session_id": session_id, "dashboard_id": dashboard_ctx.get("id")},
        )

        # Run through the analyst
        company_profile = self._get_company_profile_dict()
        focus_items = self._get_focus_items_dicts()

        result: AnalysisResult = await self.analyst.analyze(
            question=augmented_message,
            session_id=session_id,
            company_profile=company_profile,
            focus_items=focus_items,
        )

        new_charts = [
            {
                "type": c.chart_type,
                "title": c.title,
                "data": c.data,
                "xKey": c.x_key,
                "yKeys": c.y_keys,
                "colors": c.colors,
                "format": c.format,
            }
            for c in result.charts
        ]

        # Determine if this is an "add" or "replace_all" operation
        msg_lower = message.lower()
        is_replace = any(
            kw in msg_lower
            for kw in ["replace", "change to", "show as", "switch to", "convert to", "redo", "rebuild", "start over"]
        )

        if is_replace and new_charts:
            dashboard_update = {"action": "replace_all", "charts": new_charts}
        elif new_charts:
            dashboard_update = {"action": "add", "charts": new_charts}
        else:
            dashboard_update = None

        return {
            "session_id": session_id,
            "content": result.narrative,
            "chart_configs": new_charts,
            "dashboard_update": dashboard_update,
            "confidence": result.confidence,
        }

    async def _handle_deep_dive(
        self, message: str, session_id: str,
    ) -> dict[str, Any]:
        """Kick off a background deep dive and return immediately."""
        import uuid
        dive_id = f"dive-{uuid.uuid4().hex[:8]}"

        # Import here to access the in-memory store
        from backend.app.api.routes.deep_dives import _active_dives

        _active_dives[dive_id] = {
            "id": dive_id,
            "topic": message,
            "status": "processing",
            "progress": 5,
            "title": None,
            "content": None,
            "charts": [],
        }

        agent = DeepDiveAgent(
            warehouse=self.warehouse,
            broadcaster=self.broadcaster,
            settings=self.settings,
        )

        import asyncio
        async def _run():
            try:
                result = await agent.run(message, dive_id)
                _active_dives[dive_id].update({
                    "status": "complete",
                    "progress": 100,
                    "title": result.get("title"),
                    "content": result.get("content", ""),
                    "charts": result.get("charts", []),
                })
            except Exception as exc:
                _active_dives[dive_id].update({
                    "status": "error",
                    "content": f"Analysis failed: {str(exc)[:500]}",
                })

        asyncio.create_task(_run())

        return {
            "session_id": session_id,
            "content": (
                f"I'm starting a deep dive analysis on that topic. "
                f"This will take 2-3 minutes — I'm running multiple queries, "
                f"cross-referencing data, and building a comprehensive report.\n\n"
                f"Check the **Deep Dives** page to see the progress and final report."
            ),
            "chart_configs": [],
            "confidence": "high",
            "deep_dive_id": dive_id,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_company_profile_dict(self) -> dict[str, Any] | None:
        profile = self.memory.get_company_profile()
        if profile is None:
            return None
        return {
            "name": profile.name,
            "industry": profile.industry,
            "description": profile.description,
            "key_metrics": profile.get_key_metrics(),
        }

    def _get_focus_items_dicts(self) -> list[dict[str, Any]]:
        items = self.memory.get_focus_items(active_only=True)
        return [
            {
                "metric_name": item.metric_name,
                "display_name": item.display_name,
                "status": item.status,
                "current_value": item.current_value,
                "direction": item.direction,
            }
            for item in items
        ]

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


def _extract_dashboard_title(message: str) -> str:
    """Try to pull a sensible dashboard title from the user message."""
    cleaned = re.sub(
        r"^(create|build|make|save)\s+(me\s+)?(a\s+)?(new\s+)?dashboard\s*(of|for|about|showing|with)?\s*",
        "",
        message.strip(),
        flags=re.IGNORECASE,
    )
    if cleaned and len(cleaned) > 3:
        return cleaned[0].upper() + cleaned[1:]
    return "Dashboard"
