"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSearch, Clock, TrendingDown, Users, Send, Brain, Loader2, Trash2, Sparkles } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { connectThoughtStream, sendChatMessage } from "@/lib/websocket";
import { useChatStore, useThoughtStore, useDeepDiveStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/lib/types";

interface FollowUp {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
}

interface DeepDive {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  charts: ChartConfig[];
  createdAt: string;
  icon: React.ComponentType<{ className?: string }>;
  followUpSuggestions: string[];
}

const DEMO_DEEP_DIVES: DeepDive[] = [
  {
    id: "1",
    title: "Discount Impact on Revenue per Store",
    summary: "Every 1% discount increase costs EUR 103K annually across all showrooms. Showroom 3 is over-discounting at 11.78%.",
    fullContent: `Here's the breakdown: **every 1% increase in discount costs us real money**, and the impact varies significantly across our showrooms.

**Showroom 1** — our top performer with **EUR 4.38M in revenue** — would lose **EUR 46,129** for every 1 percentage point we add to discounts. That's a **1.05% hit** to current revenue. They're running at 4.96% average discount right now, so they have relatively low promotional pressure.

**Showroom 2** pulls **EUR 3.58M** and would lose **EUR 38,539** per 1% discount increase (a **1.08% revenue impact**). They're already at 6.98% discount rate — higher than Showroom 1 — so piling on more discounts here gets expensive fast.

**Showroom 3** is the outlier. They're at **11.78% average discount** — more than double Showroom 1 — and generating only **EUR 1.61M**. A 1% discount bump costs them **EUR 18,276**, which is **1.14% of their revenue**.

**Bottom line:** Across all three showrooms, a 1% blanket discount increase would cost us roughly **EUR 103K in total annual revenue**. Showroom 3 is already over-discounting — we need to look at pricing strategy and product mix there, not more promotions.`,
    charts: [
      {
        type: "bar",
        title: "Revenue Impact per 1% Discount Increase",
        data: [
          { showroom: "Showroom 1", impact: 46129 },
          { showroom: "Showroom 2", impact: 38539 },
          { showroom: "Showroom 3", impact: 18276 },
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
    followUpSuggestions: [
      "What products are most discounted at Showroom 3?",
      "Run a regression of discount vs conversion rate",
      "What would happen if we cap Showroom 3 discounts at 8%?",
    ],
  },
  {
    id: "2",
    title: "Sofa Margin Squeeze: Foam Cost Analysis",
    summary: "Foam supplier Tessuti Milano raised prices 18% in Oct 2024. Sofa margins dropped from 42% to 28%.",
    fullContent: `Our sofa margins have been under serious pressure since **October 2024** when Tessuti Milano — our foam supplier — pushed through an **18% price increase**.

Before the hike, we were running at a healthy **42% gross margin** on sofas. Post-hike, that's dropped to **28%**. That's a 14 percentage point swing on our highest-volume product category.

The impact flows through every sofa we make. We're looking at roughly **EUR 180K in lost margin** over the last quarter alone.

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
    followUpSuggestions: [
      "Which sofa models are hit hardest?",
      "How much foam does each sofa use?",
      "What's our price elasticity on sofas?",
    ],
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
    followUpSuggestions: [
      "Show Rossi Interiors' full order history",
      "Which other VIP customers are at risk?",
      "What's our customer acquisition cost for B2B?",
    ],
  },
];

function FollowUpThread({ dive }: { dive: DeepDive }) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useChatStore((s) => s.sessionId);
  const { clearThoughts, setProcessing } = useThoughtStore();
  const thoughts = useThoughtStore((s) => s.thoughts);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [followUps, thoughts]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;
      setInput("");

      setFollowUps((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg }]);
      setLoading(true);
      clearThoughts();
      setProcessing(true);

      // Send with context about this deep dive
      const contextMessage = `${msg}\n\n[CONTEXT: This is a follow-up to the deep dive "${dive.title}". Summary: ${dive.summary}]`;

      try {
        const response = await sendChatMessage(contextMessage, sessionId);
        const charts: ChartConfig[] = (response.charts || []).map((c) => ({
          type: c.type as ChartConfig["type"],
          title: c.title,
          data: c.data as Record<string, unknown>[],
          xKey: c.xKey,
          yKeys: c.yKeys,
          colors: c.colors,
        }));

        setFollowUps((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: response.reply || "",
            charts: charts.length > 0 ? charts : undefined,
          },
        ]);
      } catch {
        setFollowUps((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "assistant", content: "Something went wrong. Try again?" },
        ]);
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    },
    [input, loading, sessionId, dive, clearThoughts, setProcessing]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const activeThoughts = loading ? thoughts.slice(-4) : [];

  return (
    <div className="border-t border-border mt-4 pt-4">
      {/* Follow-up thread */}
      {followUps.length > 0 && (
        <div ref={scrollRef} className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
          {followUps.map((fu) => (
            <div key={fu.id} className={cn("flex", fu.role === "user" ? "justify-end" : "justify-start gap-2")}>
              {fu.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Brain className="w-3 h-3 text-background" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2",
                fu.role === "user" ? "bg-foreground text-background text-sm" : "bg-muted/30"
              )}>
                {fu.role === "assistant" ? (
                  <>
                    <Markdown content={fu.content} className="text-sm" />
                    {fu.charts && fu.charts.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {fu.charts.map((chart, ci) => (
                          <ChartRenderer key={ci} config={chart} height={220} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  fu.content
                )}
              </div>
            </div>
          ))}

          {/* Live processing steps */}
          {loading && (
            <div className="space-y-1 pl-8">
              {activeThoughts.map((t, i) => (
                <motion.p
                  key={`t-${i}`}
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {t.content}
                </motion.p>
              ))}
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground">Analyzing...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestion chips */}
      {followUps.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs text-muted-foreground mr-1">Follow up:</span>
          {dive.followUpSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/50 transition-all disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask a follow-up about ${dive.title.toLowerCase()}...`}
          disabled={loading}
          className="flex-1 text-sm bg-muted/30 rounded-lg px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-foreground/20 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            input.trim() && !loading ? "bg-foreground text-background" : "text-muted-foreground/30"
          )}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function DiveCard({ dive, isExpanded, onToggle, onDelete }: {
  dive: DeepDive;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const Icon = dive.icon || FileSearch;
  return (
    <motion.div
      className="glass rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="flex items-start group">
        <button
          onClick={onToggle}
          className="flex-1 text-left px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">{dive.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{dive.summary}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
            <Clock className="w-3 h-3 inline mr-1" />
            {new Date(dive.createdAt).toLocaleDateString()}
          </span>
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-3 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

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
              {dive.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-5">
                  {dive.charts.map((chart, ci) => (
                    <ChartRenderer key={ci} config={chart} height={240} />
                  ))}
                </div>
              )}
              <div className="bg-muted/20 rounded-lg p-5 border border-border">
                <Markdown content={dive.fullContent} />
              </div>
              <FollowUpThread dive={dive} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DeepDivesPage() {
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const savedDives = useDeepDiveStore((s) => s.dives);
  const deleteDeepDive = useDeepDiveStore((s) => s.deleteDeepDive);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
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
              In-depth analyses with data-backed recommendations. Click to expand, ask follow-ups.
            </p>
          </motion.div>

          {/* Saved from chat */}
          {savedDives.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> From Alex
              </h2>
              <div className="space-y-3">
                {savedDives.map((dive) => (
                  <DiveCard
                    key={dive.id}
                    dive={{ ...dive, icon: FileSearch, followUpSuggestions: ["Tell me more about this", "What should we do next?", "How does this compare historically?"] }}
                    isExpanded={expandedId === dive.id}
                    onToggle={() => setExpandedId(expandedId === dive.id ? null : dive.id)}
                    onDelete={() => deleteDeepDive(dive.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Demo deep dives */}
          <div>
            {savedDives.length > 0 && (
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Sample Analyses
              </h2>
            )}
            <div className="space-y-3">
              {DEMO_DEEP_DIVES.map((dive) => (
                <DiveCard
                  key={dive.id}
                  dive={dive}
                  isExpanded={expandedId === dive.id}
                  onToggle={() => setExpandedId(expandedId === dive.id ? null : dive.id)}
                />
              ))}
            </div>
          </div>
      </div>
    </div>
  );
}
