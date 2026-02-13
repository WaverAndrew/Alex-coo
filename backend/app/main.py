from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster, ThoughtEvent

from backend.app.api.routes.chat import router as chat_router
from backend.app.api.routes.data import router as data_router
from backend.app.api.routes.dashboards import router as dashboards_router
from backend.app.api.routes.focus import router as focus_router
from backend.app.api.routes.company import router as company_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- startup ----
    logger.info("Starting SME BI backend ...")

    # Warehouse
    warehouse = DuckDBWarehouse(db_path=settings.DB_PATH)
    loaded_tables = warehouse.load_csvs(settings.DATA_DIR)
    logger.info("Loaded %d table(s) into DuckDB: %s", len(loaded_tables), loaded_tables)

    # Memory store
    memory = MemoryStore()
    memory.init_db()

    # Thought stream
    broadcaster = ThoughtBroadcaster()

    # Attach to app state
    app.state.warehouse = warehouse
    app.state.memory = memory
    app.state.settings = settings
    app.state.broadcaster = broadcaster

    logger.info("Backend ready on %s:%s", settings.HOST, settings.PORT)

    yield

    # ---- shutdown ----
    warehouse.close()
    logger.info("Backend shut down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SME BI - Alex COO Agent",
    description="Backend API for the SME Business Intelligence agent",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat_router)
app.include_router(data_router)
app.include_router(dashboards_router)
app.include_router(focus_router)
app.include_router(company_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# WebSocket - thought stream
# ---------------------------------------------------------------------------

@app.websocket("/ws/thoughts")
async def ws_thoughts(ws: WebSocket):
    """WebSocket endpoint for the real-time thought stream.

    Clients connect here to receive live ThoughtEvents as the agent
    reasons through a question.  Events are broadcast by the
    ThoughtBroadcaster whenever the AnalystAgent or Orchestrator
    calls ``broadcaster.broadcast(event)``.

    The client may also send JSON messages over the socket.  Currently
    supported client message types:

        {"type": "ping"}             -> responds with a pong event
        {"type": "chat", "message": "...", "session_id": "..."}
                                     -> optionally process a chat message
                                        (primary chat goes via POST /api/chat)
    """
    broadcaster: ThoughtBroadcaster = app.state.broadcaster
    await broadcaster.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()

            # Try to parse as JSON
            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                data = {"type": "unknown", "raw": raw}

            msg_type = data.get("type", "unknown")

            if msg_type == "ping":
                # Simple keep-alive
                pong = ThoughtEvent(
                    type="pong",
                    content="pong",
                    metadata={},
                )
                await broadcaster.send(ws, pong)

            elif msg_type == "chat":
                # Optional: handle chat over WebSocket (fire-and-forget style).
                # The primary chat flow uses POST /api/chat, but this allows
                # the frontend to send questions over the same socket if desired.
                from backend.app.agents.orchestrator import Orchestrator

                message = data.get("message", "")
                session_id = data.get("session_id", "ws-session")

                if message:
                    orchestrator = Orchestrator(
                        warehouse=app.state.warehouse,
                        memory_store=app.state.memory,
                        broadcaster=broadcaster,
                        settings=settings,
                    )

                    result = await orchestrator.process_message(message, session_id)

                    # Send the final result back to this specific client
                    response_event = ThoughtEvent(
                        type="chat_response",
                        content=result.get("content", ""),
                        metadata={
                            "session_id": session_id,
                            "chart_configs": result.get("chart_configs", []),
                        },
                    )
                    await broadcaster.send(ws, response_event)

            else:
                # Unknown message type — acknowledge receipt
                ack = ThoughtEvent(
                    type="ack",
                    content=f"Received message of type: {msg_type}",
                    metadata={"original_type": msg_type},
                )
                await broadcaster.send(ws, ack)

    except WebSocketDisconnect:
        await broadcaster.disconnect(ws)
    except Exception:
        logger.debug("WebSocket connection error", exc_info=True)
        await broadcaster.disconnect(ws)


# ---------------------------------------------------------------------------
# WebSocket - chat (dedicated per-message connection from frontend)
# ---------------------------------------------------------------------------

@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket):
    """Dedicated chat WebSocket endpoint.

    The frontend opens a fresh connection per question, sends a single message,
    receives thought events + final response, then closes.

    Client sends:
        {"message": "...", "session_id": "..."}

    Server sends (in order):
        {"type": "thought", "thought_type": "thinking|executing_sql|...", "content": "..."}
        ...
        {"type": "response", "reply": "...", "charts": [...], "session_id": "..."}
    """
    await ws.accept()
    try:
        raw = await ws.receive_text()
        data = json.loads(raw)
        message = data.get("message", "")
        session_id = data.get("session_id", "ws-session")
        context = data.get("context")  # optional: {page, dashboard: {id, title, charts}}

        if not message:
            await ws.send_text(json.dumps({"type": "error", "content": "Empty message"}))
            return

        # Create a per-connection broadcaster that sends thoughts to this WS
        class WSChatBroadcaster(ThoughtBroadcaster):
            def __init__(self, target_ws: WebSocket, global_broadcaster: ThoughtBroadcaster):
                super().__init__()
                self._target = target_ws
                self._global = global_broadcaster

            async def broadcast(self, event: ThoughtEvent) -> None:
                thought_payload = {
                    "type": "thought",
                    "thought_type": event.type,
                    "content": event.content,
                    "metadata": event.metadata,
                }
                try:
                    await self._target.send_text(json.dumps(thought_payload))
                except Exception:
                    pass

        chat_broadcaster = WSChatBroadcaster(ws, app.state.broadcaster)

        from backend.app.agents.orchestrator import Orchestrator

        orchestrator = Orchestrator(
            warehouse=app.state.warehouse,
            memory_store=app.state.memory,
            broadcaster=chat_broadcaster,
            settings=settings,
        )

        result = await orchestrator.process_message(message, session_id, context=context)

        # Send final response
        response_payload = {
            "type": "response",
            "reply": result.get("content", ""),
            "charts": result.get("chart_configs", []),
            "dashboard_update": result.get("dashboard_update"),
            "session_id": session_id,
        }
        await ws.send_text(json.dumps(response_payload))

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception("Chat WebSocket error")
        try:
            await ws.send_text(json.dumps({
                "type": "error",
                "content": f"Something went wrong: {str(exc)[:200]}",
            }))
        except Exception:
            pass
