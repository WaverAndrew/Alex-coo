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

Alex is an AI-native COO agent that connects directly to a company's data and operates as a knowledgeable business partner. Not a chatbot that answers questions. Not a dashboard you have to learn. A coworker who:

- **Knows every number in the business** — revenue, margins, customers, suppliers, inventory, production
- **Proactively flags problems** — before they become crises
- **Runs deep analyses on demand** — regression, trend analysis, cross-referencing
- **Builds dashboards you can edit by talking** — "add a margin chart" and it appears
- **Reaches you where you are** — web app, Telegram, WhatsApp

Alex doesn't replace human judgment. Alex gives SME owners the same quality of information that Fortune 500 executives take for granted — so they can make better decisions, faster.

## The Demo: Bella Casa Furniture

For this hackathon, Alex is deployed as the COO of **Bella Casa Furniture**, an Italian furniture manufacturer and retailer. 18 months of synthetic data across 12 interconnected tables, with 5 real business stories embedded in the data for Alex to discover:

| Story | What Alex Finds |
|-------|----------------|
| 🔴 **Sofa Margin Squeeze** | Foam supplier raised prices 18% → sofa margins dropped from 42% to 28% |
| 📈 **Online Channel Surge** | Website relaunch drove online from 15% to 36% of revenue |
| ⚠️ **Showroom 3 Underperformance** | Highest discounts (12%), lowest ratings (3.4/5), weakest revenue |
| 📊 **Seasonal Bed Boom** | 2.5x sales spike in Oct-Nov — needs production planning |
| 🚨 **VIP Concentration Risk** | Top customer (12% of revenue) hasn't ordered in 67 days |

Alex discovers all of these through natural conversation — no configuration, no training, no setup beyond connecting the data.

## Features

### 🧠 Conversational Analytics
Ask Alex anything in natural language. It writes SQL, queries the data warehouse, interprets results, and responds with insights — not raw data.

```
You: "How's revenue trending?"
Alex: "Revenue in January hit EUR 1.48M, up 12% from December..."
      [renders an interactive line chart inline]
```

### 📊 Rich Visual Response
Alex's responses aren't just text. The UI renders:
- **Metric pills** — bold numbers highlighted as interactive elements
- **Colored callout cards** — warnings (amber), insights (blue), actions (purple), positive signals (green)
- **Inline charts** — bar, line, area, pie, donut, geographic maps
- **Every response** has a "Save as Dashboard" or "Save as Deep Dive" button

### 🗺️ Supply Chain Map
Ask about supply chain status and Alex generates a **Palantir-style geographic map** of Italy showing all supplier locations, delivery status (on-time/delayed/critical), and supply route lines to HQ.

### 📋 Interactive Dashboards
- **Create from chat**: "Build a dashboard of our showroom performance" → saved to dashboards
- **Edit in-place**: Open a dashboard, click "Edit this dashboard" → right panel slides in for conversational editing
- **Per-chart controls**: Hover any chart to edit or delete it individually
- **Persistent**: All changes saved to localStorage, survive page reloads

### 🔬 Deep Dive Research Agent
Not every question deserves a quick answer. When you need depth:

```
You: "Do a deep dive on our discount strategy"
Alex: "Starting analysis — check Deep Dives in ~3 minutes"
```

The Deep Dive Agent runs a **5-phase background pipeline**:
1. **Plan** — designs 8-15 SQL queries across multiple data angles
2. **Gather** — executes queries with live progress updates
3. **Analyze** — cross-references all findings
4. **Visualize** — generates 4-8 charts
5. **Synthesize** — produces a structured report with executive summary, statistical analysis, recommendations, and risk factors

The sample deep dive includes a **linear regression analysis** (discount % vs revenue, R²=0.34, per-channel coefficients).

### 🚨 Proactive Alerts
Alex watches your business metrics and surfaces issues before they escalate:
- **Critical**: "Rossi Interiors hasn't ordered in 67 days — they're 12% of revenue"
- **Warning**: "Sofa margins at 28%, down from 42%"
- **Info**: "Online channel growing faster than fulfillment capacity"

Each alert is clickable → opens a focused analysis in chat.

### 🔍 Agent Interpretability
Every response shows Alex's reasoning process:
- 🧠 Thinking steps
- 💾 SQL queries executed (expandable)
- 💡 Insights found
- 📊 Charts generated

In the chat, these appear inline. In the dashboard editor, they show in the right panel.

### 💬 Messaging Integrations
Alex meets you where you are:
- **Telegram**: Full bot integration — same agent, same data, same quality
- **WhatsApp**: Business API webhook ready — configure and go
- **Web app**: Premium dark UI with glassmorphism, particles, serif typography

### 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + Tailwind + Recharts)        │
│  ├── Hub — metrics, insights, revenue chart          │
│  ├── Chat — centered single-column, inline thinking  │
│  ├── Dashboards — editable chart grids               │
│  ├── Deep Dives — full document reports              │
│  └── Alerts — clickable insight cards                │
├─────────────────────────────────────────────────────┤
│  Backend (FastAPI + DuckDB + Claude API)             │
│  ├── Orchestrator — intent classification + routing   │
│  ├── AnalystAgent — Claude tool-use loop (SQL+charts)│
│  ├── DeepDiveAgent — 5-phase background research     │
│  ├── Persona — Alex's COO character + context        │
│  ├── ThoughtBroadcaster — real-time WebSocket events │
│  └── Integrations — Telegram bot + WhatsApp webhook  │
├─────────────────────────────────────────────────────┤
│  Data Layer                                          │
│  ├── DuckDB in-memory warehouse (12 tables)          │
│  ├── SQLite memory store (conversations, dashboards) │
│  └── Synthetic data generator (Bella Casa Furniture) │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key

### 1. Clone and setup
```bash
git clone https://github.com/WaverAndrew/Alex-coo.git
cd Alex-coo
```

### 2. Backend
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Generate demo data
python -m backend.generate_data.main

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY

# Start
uvicorn backend.app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open
Navigate to `http://localhost:3000`

### Optional: Telegram Bot
1. Create a bot via @BotFather on Telegram
2. Add `TELEGRAM_BOT_TOKEN=your-token` to `backend/.env`
3. Restart backend — bot starts automatically

## Data Model

12 interconnected tables covering a complete manufacturing + retail operation:

| Table | Rows | Description |
|-------|------|-------------|
| `suppliers` | 8 | Italian suppliers with geo coordinates |
| `materials` | 25 | Raw materials with costs and reorder points |
| `products` | 18 | Furniture products (sofas, beds, tables, chairs, storage) |
| `bill_of_materials` | 71 | Product → material mappings |
| `customers` | 800 | B2B and B2C customers across channels |
| `purchase_orders` | 1,200 | Supplier procurement |
| `production_orders` | 596 | Manufacturing runs |
| `sales_orders` | 3,491 | Revenue transactions |
| `order_line_items` | 7,805 | Individual product lines |
| `inventory_snapshots` | 450 | Stock levels over time |
| `daily_metrics` | 581 | Aggregated business KPIs |
| `supplier_performance` | 151 | Monthly supplier scorecards |

## Why Claude?

Alex is built entirely on Claude's capabilities:

- **Tool use** — Alex writes and executes SQL queries, generates chart configurations, and manages multi-step analysis through Claude's native tool-use API
- **Persona consistency** — Claude maintains Alex's COO character across thousands of interactions without breaking
- **Reasoning depth** — The deep dive agent leverages Claude's ability to plan research strategies, cross-reference data from 10+ queries, and synthesize structured reports
- **Intent understanding** — Natural language is classified into analysis, dashboard creation, deep dives, monitoring, or chitchat without rigid command syntax

The entire agent pipeline — from understanding a question to writing SQL to interpreting results to generating charts to crafting a narrative — is a single Claude tool-use loop. No fine-tuning. No RAG. No vector databases. Just Claude + SQL + good prompting.

## The Vision

Alex is a demo, but the thesis is real. Every SME in Europe — every restaurant tracking ingredients, every manufacturer managing suppliers, every retailer analyzing customers — could have an Alex.

The cost? A few euros per conversation. The value? Decisions backed by data instead of intuition. Problems caught in days instead of months. Growth opportunities identified instead of missed.

**Claude doesn't just answer questions. It creates economic value.**

---

<p align="center">
  <sub>Built for the Anthropic Hackathon 2025 by <a href="https://github.com/WaverAndrew">@WaverAndrew</a></sub><br/>
  <sub>Powered by Claude Opus 4.6 · claude-sonnet-4-5-20250929</sub>
</p>
