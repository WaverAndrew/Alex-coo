"""Telegram bot integration for Alex COO Agent.

Setup:
1. Create a bot via @BotFather on Telegram
2. Get the token and set TELEGRAM_BOT_TOKEN in .env
3. The bot starts automatically with the FastAPI app

Users can chat with Alex directly in Telegram.
Charts are described in text (view full charts on the web app).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

from backend.app.agents.orchestrator import Orchestrator
from backend.app.config import settings
from backend.app.data.warehouse import DuckDBWarehouse
from backend.app.memory.store import MemoryStore
from backend.app.thought_stream import ThoughtBroadcaster

logger = logging.getLogger(__name__)

_bot_app: Application | None = None


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    await update.message.reply_text(
        "Hey! I'm Alex, COO of Bella Casa Furniture. 🪑\n\n"
        "Ask me anything about our business — revenue, margins, "
        "customers, suppliers, production metrics.\n\n"
        "Try: \"How's revenue this month?\" or \"Compare our showrooms\"\n\n"
        "For charts and dashboards, check the web app."
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages — route through the Alex agent."""
    if not update.message or not update.message.text:
        return

    user_msg = update.message.text.strip()
    chat_id = str(update.message.chat_id)

    logger.info("Telegram message from %s: %s", chat_id, user_msg[:80])

    # Send typing indicator
    await update.message.chat.send_action("typing")

    try:
        # Get the shared app state from context
        warehouse: DuckDBWarehouse = context.bot_data["warehouse"]
        memory: MemoryStore = context.bot_data["memory"]
        broadcaster: ThoughtBroadcaster = context.bot_data["broadcaster"]

        orchestrator = Orchestrator(
            warehouse=warehouse,
            memory_store=memory,
            broadcaster=broadcaster,
            settings=settings,
        )

        result = await orchestrator.process_message(user_msg, f"tg-{chat_id}")

        content = result.get("content", "I couldn't process that. Try again?")
        charts = result.get("chart_configs", [])

        # Format response
        response = content

        # Append chart summaries if any
        if charts:
            response += "\n\n📊 *Charts generated:*"
            for c in charts:
                response += f"\n• {c.get('title', 'Chart')} ({c.get('type', '?')})"
            response += "\n\n_View interactive charts on the web app._"

        # Telegram has a 4096 char limit
        if len(response) > 4000:
            # Split into chunks
            chunks = [response[i:i+4000] for i in range(0, len(response), 4000)]
            for chunk in chunks:
                await update.message.reply_text(chunk, parse_mode="Markdown")
        else:
            await update.message.reply_text(response, parse_mode="Markdown")

    except Exception as exc:
        logger.exception("Telegram handler error")
        await update.message.reply_text(
            "I hit a snag processing that. Could you rephrase?"
        )


def create_telegram_bot(
    warehouse: DuckDBWarehouse,
    memory: MemoryStore,
    broadcaster: ThoughtBroadcaster,
) -> Application | None:
    """Create and configure the Telegram bot. Returns None if no token is set."""
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None) or ""
    if not token or token == "your-telegram-bot-token":
        logger.info("No Telegram bot token configured — skipping")
        return None

    app = Application.builder().token(token).build()

    # Store shared state
    app.bot_data["warehouse"] = warehouse
    app.bot_data["memory"] = memory
    app.bot_data["broadcaster"] = broadcaster

    # Handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Telegram bot configured")
    return app


async def start_telegram_polling(
    warehouse: DuckDBWarehouse,
    memory: MemoryStore,
    broadcaster: ThoughtBroadcaster,
):
    """Start the Telegram bot in polling mode (for development)."""
    global _bot_app
    _bot_app = create_telegram_bot(warehouse, memory, broadcaster)
    if _bot_app is None:
        return

    logger.info("Starting Telegram bot polling...")
    await _bot_app.initialize()
    await _bot_app.start()
    await _bot_app.updater.start_polling()


async def stop_telegram_polling():
    """Stop the Telegram bot."""
    global _bot_app
    if _bot_app:
        await _bot_app.updater.stop()
        await _bot_app.stop()
        await _bot_app.shutdown()
        _bot_app = None
        logger.info("Telegram bot stopped")
