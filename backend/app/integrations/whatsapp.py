"""WhatsApp Business API integration for Alex COO Agent.

Setup:
1. Create a Meta Business App at developers.facebook.com
2. Set up WhatsApp Business API
3. Configure webhook URL: https://your-domain/api/whatsapp/webhook
4. Set WHATSAPP_TOKEN and WHATSAPP_VERIFY_TOKEN in .env
5. Set WHATSAPP_PHONE_NUMBER_ID in .env

This module provides:
- Webhook verification endpoint (GET)
- Message handler endpoint (POST)
- Send message helper
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Request, Response

from backend.app.agents.orchestrator import Orchestrator
from backend.app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

WHATSAPP_API = "https://graph.facebook.com/v18.0"


@router.get("/webhook")
async def verify_webhook(request: Request) -> Response:
    """WhatsApp webhook verification (GET challenge)."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    verify_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "")

    if mode == "subscribe" and token == verify_token:
        logger.info("WhatsApp webhook verified")
        return Response(content=challenge, media_type="text/plain")

    return Response(content="Forbidden", status_code=403)


@router.post("/webhook")
async def handle_webhook(request: Request) -> dict:
    """Handle incoming WhatsApp messages."""
    body = await request.json()

    try:
        entries = body.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])

                for msg in messages:
                    if msg.get("type") == "text":
                        from_number = msg["from"]
                        text = msg["text"]["body"]

                        logger.info("WhatsApp message from %s: %s", from_number, text[:80])

                        # Process through Alex
                        orchestrator = Orchestrator(
                            warehouse=request.app.state.warehouse,
                            memory_store=request.app.state.memory,
                            broadcaster=request.app.state.broadcaster,
                            settings=request.app.state.settings,
                        )

                        result = await orchestrator.process_message(
                            text, f"wa-{from_number}"
                        )

                        content = result.get("content", "I couldn't process that.")
                        charts = result.get("chart_configs", [])

                        # Build response
                        response_text = content
                        if charts:
                            response_text += f"\n\n📊 {len(charts)} chart(s) generated — view them on the web app."

                        # Send reply
                        await send_whatsapp_message(from_number, response_text)

    except Exception as exc:
        logger.exception("WhatsApp webhook error: %s", exc)

    return {"status": "ok"}


async def send_whatsapp_message(to: str, text: str):
    """Send a text message via WhatsApp Business API."""
    token = getattr(settings, "WHATSAPP_TOKEN", "")
    phone_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")

    if not token or not phone_id:
        logger.warning("WhatsApp not configured — message not sent to %s", to)
        return

    # Truncate to WhatsApp limit
    if len(text) > 4096:
        text = text[:4090] + "\n..."

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{WHATSAPP_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": text},
            },
        )

        if response.status_code != 200:
            logger.error("WhatsApp send failed: %s %s", response.status_code, response.text[:200])
        else:
            logger.info("WhatsApp message sent to %s", to)
