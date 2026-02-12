"""Chat endpoint — wired to the full Alex agent pipeline."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.agents.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ChatResponse(BaseModel):
    session_id: str
    content: str
    chart_configs: list[dict[str, Any]] = Field(default_factory=list)
    confidence: str = "high"
    intent: str = "analysis"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    """Accept a user message and return Alex's response.

    This endpoint wires together the full agent pipeline:
    Orchestrator -> intent classification -> AnalystAgent -> Claude tool-use
    loop -> narrative + charts.
    """
    orchestrator = Orchestrator(
        warehouse=request.app.state.warehouse,
        memory_store=request.app.state.memory,
        broadcaster=request.app.state.broadcaster,
        settings=request.app.state.settings,
    )

    result = await orchestrator.process_message(
        message=body.message,
        session_id=body.session_id,
    )

    return ChatResponse(
        session_id=result.get("session_id", body.session_id),
        content=result.get("content", ""),
        chart_configs=result.get("chart_configs", []),
        confidence=result.get("confidence", "high"),
        intent=result.get("intent", "analysis"),
    )


@router.post("/stream")
async def chat_stream(body: ChatRequest, request: Request) -> StreamingResponse:
    """Streaming variant of the chat endpoint.

    Streams newline-delimited JSON chunks:
      {"type": "thinking", "content": "..."}
      {"type": "text", "content": "..."}
      {"type": "chart", "config": {...}}
      {"type": "done", "confidence": "...", "intent": "..."}

    The thought stream (thinking, executing_sql, etc.) is also delivered
    via the /ws/thoughts WebSocket for real-time intermediate events.
    """
    orchestrator = Orchestrator(
        warehouse=request.app.state.warehouse,
        memory_store=request.app.state.memory,
        broadcaster=request.app.state.broadcaster,
        settings=request.app.state.settings,
    )

    async def _generate():
        # Send initial thinking event
        yield json.dumps({"type": "thinking", "content": "Analyzing your question..."}) + "\n"

        try:
            result = await orchestrator.process_message(
                message=body.message,
                session_id=body.session_id,
            )

            # Stream the narrative text
            content = result.get("content", "")
            if content:
                yield json.dumps({"type": "text", "content": content}) + "\n"

            # Stream each chart config
            for chart in result.get("chart_configs", []):
                yield json.dumps({"type": "chart", "config": chart}) + "\n"

            yield json.dumps({
                "type": "done",
                "confidence": result.get("confidence", "high"),
                "intent": result.get("intent", "analysis"),
            }) + "\n"

        except Exception as exc:
            logger.exception("Error in chat stream")
            yield json.dumps({
                "type": "text",
                "content": (
                    "I hit a snag analyzing that. Let me know if you want "
                    "to try rephrasing the question."
                ),
            }) + "\n"
            yield json.dumps({"type": "done", "confidence": "low"}) + "\n"

    return StreamingResponse(_generate(), media_type="application/x-ndjson")
