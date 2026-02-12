"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSearch, Clock, TrendingDown, Users, ShoppingCart } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { Markdown } from "@/components/chat/Markdown";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { connectThoughtStream } from "@/lib/websocket";
import type { ChartConfig } from "@/lib/types";

interface DeepDive {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  charts: ChartConfig[];
  createdAt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEMO_DEEP_DIVES: DeepDive[] = [
  {
    id: "1",
    title: "Discount Impact on Revenue per Store",
    summary: "Every 1% discount increase costs EUR 103K annually across all showrooms. Showroom 3 is over-discounting at 11.78%.",
    fullContent: `Here's the breakdown: **every 1% increase in discount costs us real money**, and the impact varies significantly across our showrooms.

**Showroom 1** — our top performer with **EUR 4.38M in revenue** — would lose **EUR 46,129** for every 1 percentage point we add to discounts. That's a **1.05% hit** to current revenue. They're running at 4.96% average discount right now, so they have relatively low promotional pressure.

**Showroom 2** pulls **EUR 3.58M** and would lose **EUR 38,539** per 1% discount increase (a **1.08% revenue impact**). They're already at 6.98% discount rate — higher than Showroom 1 — so piling on more discounts here gets expensive fast.

**Showroom 3** is the outlier. They're at **11.78% average discount** — more than double Showroom 1 — and generating only **EUR 1.61M**. A 1% discount bump costs them **EUR 18,276**, which is **1.14% of their revenue**. The high discount rate tells me they're either in a more competitive market or struggling with conversion.

**Bottom line:** Across all three showrooms, a 1% blanket discount increase would cost us roughly **EUR 103K in total annual revenue**. Showroom 3 is already over-discounting — we need to look at pricing strategy and product mix there, not more promotions.`,
    charts: [
      {
        type: "bar",
        title: "Revenue Impact per 1% Discount Increase",
        data: [
          { showroom: "Showroom 1", impact: 46129, discount_rate: 4.96 },
          { showroom: "Showroom 2", impact: 38539, discount_rate: 6.98 },
          { showroom: "Showroom 3", impact: 18276, discount_rate: 11.78 },
        ],
        xKey: "showroom",
        yKeys: ["impact"],
        colors: ["#dc2626"],
      },
      {
        type: "bar",
        title: "Current Average Discount Rate (%)",
        data: [
          { showroom: "Showroom 1", rate: 4.96 },
          { showroom: "Showroom 2", rate: 6.98 },
          { showroom: "Showroom 3", rate: 11.78 },
        ],
        xKey: "showroom",
        yKeys: ["rate"],
        colors: ["#d97706"],
      },
    ],
    createdAt: "2025-01-31",
    icon: TrendingDown,
  },
  {
    id: "2",
    title: "Sofa Margin Squeeze: Foam Cost Analysis",
    summary: "Foam supplier Tessuti Milano raised prices 18% in Oct 2024. Sofa margins dropped from 42% to 28%.",
    fullContent: `Our sofa margins have been under serious pressure since **October 2024** when Tessuti Milano — our foam supplier — pushed through an **18% price increase**.

Before the hike, we were running at a healthy **42% gross margin** on sofas. Post-hike, that's dropped to **28%**. That's a 14 percentage point swing on our highest-volume product category.

The impact flows through every sofa we make — the Roma Sofa, Milano Sofa, Venezia Sofa, and Toscana Sofa all use foam as a primary material. We're looking at roughly **EUR 180K in lost margin** over the last quarter alone.

**Recommended actions:**
- Negotiate a volume commitment with Tessuti Milano for a 5-8% discount
- Source quotes from alternative foam suppliers
- Consider a selective price increase on premium sofa lines (5-7%)
- Review our bill of materials for foam-reduction opportunities`,
    charts: [
      {
        type: "line",
        title: "Sofa Gross Margin Over Time",
        data: [
          { month: "Jul 24", margin: 42 },
          { month: "Aug 24", margin: 41 },
          { month: "Sep 24", margin: 40 },
          { month: "Oct 24", margin: 33 },
          { month: "Nov 24", margin: 29 },
          { month: "Dec 24", margin: 28 },
          { month: "Jan 25", margin: 28 },
        ],
        xKey: "month",
        yKeys: ["margin"],
        colors: ["#dc2626"],
      },
    ],
    createdAt: "2025-01-28",
    icon: TrendingDown,
  },
  {
    id: "3",
    title: "VIP Customer Concentration Risk",
    summary: "Top 5% of customers drive 41% of revenue. Rossi Interiors (12%) hasn't ordered since November.",
    fullContent: `We have a significant **concentration risk** in our customer base. Our top 5% of customers account for **41% of total revenue**.

The biggest concern is **Rossi Interiors** — they represent **12% of our entire revenue** and their last order was in **November 2024**. That's over 2 months of silence from a customer that was ordering regularly.

If we lose Rossi Interiors, we're looking at a **EUR 1.2M annual revenue gap** that would take 15-20 regular customers to replace.

**Action items:**
1. Immediate outreach to Rossi Interiors — schedule a relationship review meeting
2. Diversify the top-customer portfolio — target 3 new B2B accounts at EUR 300K+ potential
3. Implement an early warning system for VIP customer activity drops`,
    charts: [
      {
        type: "pie",
        title: "Revenue Concentration",
        data: [
          { segment: "Rossi Interiors", revenue: 12 },
          { segment: "Other Top 5%", revenue: 29 },
          { segment: "Remaining 95%", revenue: 59 },
        ],
        xKey: "segment",
        yKeys: ["revenue"],
      },
    ],
    createdAt: "2025-01-25",
    icon: Users,
  },
];

export default function DeepDivesPage() {
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileSearch className="w-5 h-5 text-foreground" />
              <h1 className="text-xl font-bold text-foreground">Deep Dives</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              In-depth analyses with regression and data-backed recommendations
            </p>
          </motion.div>

          <div className="space-y-4">
            {DEMO_DEEP_DIVES.map((dive, idx) => {
              const isExpanded = expandedId === dive.id;
              const Icon = dive.icon;

              return (
                <motion.div
                  key={dive.id}
                  className="glass rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                  layout
                >
                  {/* Header — always visible */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : dive.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{dive.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{dive.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground/60">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(dive.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border">
                          {/* Charts */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-5">
                            {dive.charts.map((chart, ci) => (
                              <ChartRenderer key={ci} config={chart} height={240} />
                            ))}
                          </div>

                          {/* Full analysis */}
                          <div className="bg-muted/20 rounded-lg p-5 border border-border">
                            <Markdown content={dive.fullContent} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
      <AgentStatusBar />
    </div>
  );
}
