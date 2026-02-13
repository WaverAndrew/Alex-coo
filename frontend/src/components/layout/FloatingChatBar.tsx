"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Sparkles, X, Brain, Database, Lightbulb, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveDashboardStore, useThoughtStore, useChatStore } from "@/lib/store";
import { sendChatMessage } from "@/lib/websocket";
import { Markdown } from "@/components/chat/Markdown";
import type { ChatContext, ThoughtEvent } from "@/lib/types";

interface PanelMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const GENERAL_SUGGESTIONS = [
  "How's revenue this month?",
  "Compare showrooms",
  "Top customers",
];

const DASHBOARD_SUGGESTIONS = [
  "Add a margin trend chart",
  "Show this as a line chart instead",
  "Break down by quarter",
  "Add customer segments",
];

const THOUGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  thinking: Brain,
  executing_sql: Database,
  found_insight: Lightbulb,
  generating_chart: BarChart3,
};

export function FloatingChatBar() {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const activeDashboard = useActiveDashboardStore((s) => s.dashboard);
  const updateCharts = useActiveDashboardStore((s) => s.updateCharts);
  const addChart = useActiveDashboardStore((s) => s.addChart);
  const thoughts = useThoughtStore((s) => s.thoughts);
  const { clearThoughts, setProcessing } = useThoughtStore();
  const sessionId = useChatStore((s) => s.sessionId);

  const onDashboard = !!activeDashboard;
  const hidden = pathname === "/chat" || pathname === "/onboarding";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thoughts]);

  // Listen for edit-chart events from dashboard chart buttons
  useEffect(() => {
    function handleEditChart(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setOpen(true);
        setInput(`Change the "${detail.title}" chart — `);
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    }
    window.addEventListener("edit-chart", handleEditChart);
    return () => window.removeEventListener("edit-chart", handleEditChart);
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || isLoading) return;
      setInput("");

      if (!onDashboard) {
        router.push(`/chat?q=${encodeURIComponent(msg)}`);
        setOpen(false);
        return;
      }

      const userMsg: PanelMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      clearThoughts();
      setProcessing(true);

      const context: ChatContext = {
        page: "dashboard",
        dashboard: activeDashboard
          ? { id: activeDashboard.id, title: activeDashboard.title, charts: activeDashboard.charts }
          : undefined,
      };

      try {
        const response = await sendChatMessage(msg, sessionId, context);

        if (response.dashboard_update) {
          const update = response.dashboard_update;
          if (update.action === "replace_all" && update.charts) updateCharts(update.charts);
          else if (update.action === "add" && update.charts) update.charts.forEach((c) => addChart(c));
        } else if (response.charts && response.charts.length > 0) {
          response.charts.forEach((c) => addChart(c));
        }

        const assistantMsg: PanelMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.reply || "Done — I've updated the dashboard.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "assistant", content: "Something went wrong. Try again?" },
        ]);
      } finally {
        setIsLoading(false);
        setProcessing(false);
      }
    },
    [input, isLoading, onDashboard, activeDashboard, sessionId, router, clearThoughts, setProcessing, updateCharts, addChart]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") setOpen(false);
  }, [handleSend]);

  // Don't render on chat/onboarding pages
  if (hidden) return null;

  const suggestions = onDashboard ? DASHBOARD_SUGGESTIONS : GENERAL_SUGGESTIONS;
  const placeholder = onDashboard
    ? `Edit "${activeDashboard?.title}"...`
    : "Ask Alex anything...";
  const activeThoughts = isLoading ? thoughts.slice(-6) : [];

  return (
    <>
      {/* No backdrop — dashboard stays fully interactive behind the panel */}

      {/* Right panel (dashboard mode) */}
      <AnimatePresence>
        {open && onDashboard && (
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-[420px] bg-background border-l border-border shadow-2xl shadow-black/10 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-background" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Edit Dashboard</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[250px]">{activeDashboard?.title}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages + live thoughts */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell me what to change. I can add charts, switch types, filter data, or rebuild the view.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => handleSend(s)}
                        className="px-2.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/50 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start gap-2")}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Brain className="w-3 h-3 text-background" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2",
                    msg.role === "user" ? "bg-foreground text-background text-[13px]" : "bg-muted/40 text-foreground"
                  )}>
                    {msg.role === "assistant" ? (
                      <Markdown content={msg.content} className="text-[13px]" />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* Live processing steps */}
              {isLoading && (
                <div className="space-y-1.5 pt-1">
                  {activeThoughts.map((t: ThoughtEvent, i: number) => {
                    const Icon = THOUGHT_ICONS[t.type] || Brain;
                    return (
                      <motion.div
                        key={`t-${i}`}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{t.content}</span>
                      </motion.div>
                    );
                  })}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                      <Brain className="w-3 h-3 text-background animate-pulse" />
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isLoading}
                  autoFocus
                  className="flex-1 text-sm bg-muted/30 rounded-lg px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-foreground/20 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    input.trim() && !isLoading ? "bg-foreground text-background" : "text-muted-foreground/30"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar for non-dashboard */}
      {!onDashboard && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="expanded"
                className="flex items-center gap-2 bg-background border border-border rounded-2xl shadow-lg shadow-black/8 px-4 py-2"
                initial={{ width: 56, opacity: 0.8 }} animate={{ width: 480, opacity: 1 }}
                exit={{ width: 56, opacity: 0.8 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => { if (!input.trim()) setTimeout(() => setOpen(false), 150); }}
                  placeholder="Ask Alex anything..." autoFocus
                  className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60" />
                <button onClick={() => handleSend()} disabled={!input.trim()}
                  className={cn("flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                    input.trim() ? "bg-foreground text-background" : "text-muted-foreground/40")}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.button key="collapsed"
                onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="flex items-center gap-2 bg-foreground text-background rounded-full px-5 py-2.5 shadow-lg shadow-black/10 hover:shadow-xl transition-all"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Ask Alex</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Dashboard floating pill — always visible */}
      {onDashboard && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <motion.button
            onClick={() => { setOpen(!open); if (!open) setTimeout(() => inputRef.current?.focus(), 200); }}
            className="flex items-center gap-2 bg-foreground text-background rounded-full px-5 py-2.5 shadow-lg shadow-black/10 hover:shadow-xl transition-all"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{open ? "Hide panel" : "Edit this dashboard"}</span>
          </motion.button>
        </div>
      )}
    </>
  );
}
