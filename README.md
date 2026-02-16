<p align="center">
  <h1 align="center">alex</h1>
  <p align="center"><strong>The AI operations team your SME never had.</strong></p>
  <p align="center">
    <em>Data scientist. Business analyst. Operations strategist.<br/>Always on. Always sharp. Built on Claude.</em>
  </p>
</p>

---

## The Problem

**99.8% of EU businesses are SMEs.** In Italy alone, 4.4 million small and medium enterprises form the backbone of the economy — manufacturing, retail, agriculture, services. They produce 67% of the country's GDP.

Yet most of them operate like it's 1995.

No data team. No BI tools. No dashboards. Decisions made on gut feeling, spreadsheets passed around on WhatsApp, and financial reviews that happen once a quarter — if at all. The owner is the CEO, CFO, COO, and HR department rolled into one person who's too busy running the business to analyze it.

Meanwhile, large corporations spend millions on Palantir, Tableau, and armies of consultants to extract insights from their data. **The intelligence gap between big business and SMEs has never been wider.**

## The Thesis

What if every SME could have a world-class operations team — a data scientist, a business analyst, and a strategy consultant — available 24/7, for the cost of an API call?

**That's Alex.**

Alex is an AI-native COO agent that connects directly to a company's data and operates as a knowledgeable business partner. Not a chatbot. Not a dashboard. A coworker who knows every number, flags problems before they escalate, runs regressions on demand, and builds dashboards you edit by talking to them.

**Claude doesn't just answer questions. It creates real economic value.**

---

## Architecture

### System Overview

```
                         ┌──────────────┐
                         │   Frontend   │
                         │  Next.js 16  │
                         └──────┬───────┘
                                │ HTTP + WebSocket
                         ┌──────▼───────┐        ┌─────────────┐
  Telegram ──────────────►              │        │  DuckDB     │
                         │  Orchestrator ├───────►│  Warehouse  │
  WhatsApp ──────────────►              │        │  (in-memory)│
                         └──┬───┬───┬───┘        └─────────────┘
                            │   │   │
               ┌────────────┘   │   └────────────┐
               ▼                ▼                 ▼
        ┌─────────────┐  ┌───────────┐  ┌──────────────┐
        │  Analyst     │  │ Deep Dive │  │  Dashboard   │
        │  Agent       │  │ Agent     │  │  Builder     │
        │  (realtime)  │  │ (background)│  │  + Monitor  │
        └──────┬───────┘  └─────┬─────┘  └──────────────┘
               │                │
               ▼                ▼
        ┌─────────────────────────────┐
        │    Claude API (tool-use)     │
        │    execute_sql              │
        │    recommend_chart          │
        └─────────────────────────────┘
```

### Agent System

The core of Alex is a **multi-agent orchestration layer** built on Claude's tool-use API. Every user message — whether from the web app, Telegram, or WhatsApp — flows through the same pipeline.

#### Orchestrator (`orchestrator.py`)
The central dispatcher. Receives every message and:
1. **Classifies intent** — hybrid approach: fast regex patterns for obvious cases (greetings, "create a dashboard"), Claude API call for ambiguous messages. Intent categories: `ANALYSIS`, `DASHBOARD`, `DEEP_DIVE`, `FOCUS`, `FORECAST`, `CHITCHAT`
2. **Injects context** — conversation history, company profile, active focus items, and (if on a dashboard page) the current dashboard state with all its charts
3. **Routes to the right agent** — each intent has a specialized handler
4. **Persists state** — saves conversation turns, broadcasts thought events via WebSocket

#### Analyst Agent (`analyst.py`)
The real-time analysis brain. Runs Claude in a **tool-use loop** (max 10 iterations):

- **`execute_sql`** — writes DuckDB SQL, executes against the warehouse, gets results as JSON. If the query fails, the error is fed back to Claude for self-correction.
- **`recommend_chart`** — produces Recharts-compatible chart configs (bar, line, area, pie, geo, metric). Maps snake_case tool outputs to camelCase frontend format.

Each iteration broadcasts `ThoughtEvent`s over WebSocket — thinking, executing_sql, found_insight, generating_chart — so the frontend can show live reasoning steps.

Returns: narrative markdown + chart configs + confidence level + all SQL queries executed.

#### Deep Dive Agent (`deep_dive_agent.py`)
Background research agent for comprehensive analyses. Runs **asynchronously** (2-3 minutes) with a 5-phase pipeline:

| Phase | What happens | Duration |
|-------|-------------|----------|
| **Plan** | Claude designs 8-15 SQL queries covering multiple data angles | ~5s |
| **Gather** | Executes each query sequentially, broadcasting progress | ~60-90s |
| **Analyze** | Feeds ALL gathered data back to Claude for cross-referencing | ~15s |
| **Visualize** | Generates 4-8 charts via tool-use loop | ~20s |
| **Synthesize** | Produces structured report: Executive Summary, Findings, Statistical Analysis, Recommendations, Risk Factors | ~30s |

Progress events stream in real-time via WebSocket. The frontend polls `GET /api/deep-dives/{id}` for completion status.

#### Persona (`persona.py`)
Builds the system prompt that defines Alex's character. Dynamically assembles 7 sections:
- Core personality (COO who's been with the company 3 years)
- Company context (name, industry, from the profile store)
- Full database schema (all tables + columns + types — so Claude knows what data exists)
- Active focus items and their current status
- Recent conversation history (last 8 turns)
- Tool usage instructions with DuckDB-specific syntax hints
- Output format rules optimized for the rich frontend renderer (bold metrics → pills, callout triggers for warnings/actions/insights)

#### Dashboard Builder (`dashboard_builder.py`)
Wraps dashboard persistence. When the orchestrator detects `DASHBOARD` intent, the analyst runs first, then charts are saved as a named dashboard.

When the user is **on a dashboard page**, the orchestrator detects dashboard context and routes to `_handle_dashboard_edit` — which injects the current chart state into the prompt so Claude can modify specific charts.

#### Monitor Agent (`monitor.py`)
Background metric watcher. Iterates active focus items, runs each item's SQL query, compares against warning/alert thresholds (respecting direction: higher_is_better vs lower_is_better), updates status, and broadcasts alerts.

### Data Layer

#### DuckDB Warehouse (`warehouse.py`)
In-memory analytical database. On startup, scans `backend/data/` and creates a table for each CSV using `read_csv_auto`. Provides:
- `execute_query(sql)` → list of dicts
- `get_schema()` → all tables with column names and types
- `get_table_sample(name, limit)` → sample rows
- `get_table_stats(name)` → row count, min/max/avg per column

#### Memory Store (`store.py`)
SQLite-backed persistence via SQLModel. Stores:
- **Conversation turns** — role, content, chart configs, timestamps (keyed by session_id)
- **Dashboards** — title, description, chart configs, pinned status
- **Focus items** — metric name, SQL query, thresholds, direction, current status
- **Company profile** — name, industry, description, key metrics
- **Reports** — saved analysis outputs


### Real-Time Communication

#### Thought Stream (`thought_stream.py`)
WebSocket broadcaster. Manages connected clients and broadcasts `ThoughtEvent`s:
- `thinking` — agent is reasoning
- `executing_sql` — running a query (includes SQL in metadata)
- `found_insight` — discovered something notable
- `generating_chart` — building a visualization
- `deep_dive_progress` — background research phase updates

Two WebSocket endpoints:
- `/ws/thoughts` — persistent connection for thought stream
- `/ws/chat` — per-message connection that sends thoughts + final response, used by the frontend chat

### Messaging Integrations

#### Telegram (`integrations/telegram_bot.py`)
Full bot via `python-telegram-bot`. Starts in polling mode on app startup if `TELEGRAM_BOT_TOKEN` is set. All messages route through the Orchestrator — same agent, same data, same quality. Charts summarized as text with a link to the web app.

#### WhatsApp (`integrations/whatsapp.py`)
Webhook handler for Meta WhatsApp Business API. `GET /api/whatsapp/webhook` for verification, `POST` for incoming messages. Infrastructure-ready — set token + phone ID to activate.

### Frontend

Next.js 16 App Router with a premium dark theme:

- **Hub** — metric cards with animated count-up, insight cards with glowing status indicators, revenue chart, animated particle background, serif greeting typography
- **Chat** — centered single-column layout, inline thinking steps (no side panel), history as a collapsible dropdown, stop/edit buttons on messages, rich markdown rendering with callout cards and metric pills
- **Dashboards** — editable chart grids, per-chart edit/delete on hover, right-side slide panel for conversational editing, context-aware floating chat bar
- **Deep Dives** — full document pages with charts, rich analysis, and inline follow-up threads
- **Alerts** — severity-grouped clickable cards that open focused chat analyses

State managed with Zustand stores. Chat history, dashboards, and deep dives all persist to localStorage.

---

## Features

- Conversational analytics with inline charts (bar, line, area, pie, geo map)
- Rich response rendering — metric pills, warning/insight/action callout cards
- Palantir-style supply chain geographic map
- Interactive dashboards — create from chat, edit by talking, per-chart controls
- Deep Dive research agent — 5-phase background pipeline with ML analysis
- Proactive alerts with severity grouping
- Agent interpretability — live reasoning steps visible during processing
- Chat history with session management
- Stop generation and edit/resend on messages
- Save any response as Dashboard or Deep Dive
- Telegram bot integration
- WhatsApp Business API integration
- Animated particle background
- Premium dark glassmorphism UI

## Quick Start

```bash
git clone https://github.com/WaverAndrew/Alex-coo.git
cd Alex-coo

# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.generate_data.main
cp backend/.env.example backend/.env  # add ANTHROPIC_API_KEY
uvicorn backend.app.main:app --reload

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000`

---

<p align="center">
  <sub>Built for the Anthropic Hackathon 2025 by <a href="https://github.com/WaverAndrew">@WaverAndrew</a></sub><br/>
  <sub>Powered by Claude · claude-sonnet-4-5-20250929 · claude-opus-4-6</sub>
</p>
