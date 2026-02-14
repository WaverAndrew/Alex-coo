"use client";

import { useEffect, useRef, useCallback, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, MessageSquare, History, X, Brain, Database, Lightbulb, BarChart3 } from "lucide-react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { Markdown } from "@/components/chat/Markdown";
import { useChatStore, useThoughtStore, useDashboardStore } from "@/lib/store";
import { sendChatMessage, connectThoughtStream } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChartConfig, ThoughtEvent } from "@/lib/types";

const THOUGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  thinking: Brain,
  executing_sql: Database,
  found_insight: Lightbulb,
  generating_chart: BarChart3,
};

// Inline thinking steps — replaces the permanent side panel
function InlineThinking() {
  const thoughts = useThoughtStore((s) => s.thoughts);
  const isProcessing = useThoughtStore((s) => s.isProcessing);
  if (!isProcessing && thoughts.length === 0) return null;

  const recent = thoughts.slice(-5);

  return (
    <motion.div
      className="max-w-2xl mx-auto mb-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="rounded-xl bg-muted/30 border border-border/50 px-4 py-3 space-y-1.5">
        {recent.map((t: ThoughtEvent, i: number) => {
          const Icon = THOUGHT_ICONS[t.type] || Brain;
          return (
            <motion.div
              key={`t-${i}`}
              className="flex items-start gap-2 text-xs text-muted-foreground"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="leading-relaxed">{t.content}</span>
            </motion.div>
          );
        })}
        {isProcessing && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-1 h-1 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const {
    messages, addMessage, isLoading, setLoading, sessionId,
    history, loadConversation, deleteConversation, startNewConversation,
  } = useChatStore();
  const { clearThoughts, setProcessing } = useThoughtStore();
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const abortRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [editValue, setEditValue] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (mounted) {
      const q = searchParams.get("q");
      if (q && !initialSent.current) {
        initialSent.current = true;
        startNewConversation();
        clearThoughts();
        setTimeout(() => handleSend(q), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
    setProcessing(false);
  }, [setLoading, setProcessing]);

  const handleEdit = useCallback((content: string) => {
    setEditValue(content);
  }, []);

  const handleSend = useCallback(
    async (message: string) => {
      if (isLoading) return;
      abortRef.current = false;

      addMessage({ id: `user-${Date.now()}`, role: "user", content: message, timestamp: new Date() });
      setLoading(true);
      clearThoughts();
      setProcessing(true);

      try {
        const response = await sendChatMessage(message, sessionId);
        if (abortRef.current) return;

        const charts: ChartConfig[] | undefined =
          response.charts && response.charts.length > 0 ? response.charts : undefined;

        if (response.intent === "dashboard" && charts && charts.length > 0) {
          const title = message.replace(/^(create|build|make)\s+(a\s+)?dashboard\s*(of|for|about)?\s*/i, "").trim() || "Dashboard";
          createDashboard(title.charAt(0).toUpperCase() + title.slice(1), response.reply || "", charts);
        }

        if (!abortRef.current) {
          addMessage({ id: `assistant-${Date.now()}`, role: "assistant", content: response.reply || "", charts, timestamp: new Date() });
        }
      } catch {
        if (!abortRef.current) {
          addMessage({ id: `error-${Date.now()}`, role: "assistant", content: "Sorry, I hit a snag. Could you rephrase?", timestamp: new Date() });
        }
      } finally {
        if (!abortRef.current) { setLoading(false); setProcessing(false); }
      }
    },
    [isLoading, sessionId, addMessage, setLoading, clearThoughts, setProcessing, createDashboard]
  );

  if (!mounted) return null;

  const pastConvos = history.filter((c) => c.id !== sessionId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar — history toggle + new chat */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {pastConvos.length > 0 && (
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
                historyOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>{pastConvos.length}</span>
            </button>
          )}
        </div>
        <button
          onClick={() => { startNewConversation(); clearThoughts(); setHistoryOpen(false); }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* History dropdown */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            className="border-b border-border bg-muted/20 px-6 py-3 overflow-y-auto max-h-48"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="max-w-2xl mx-auto space-y-1">
              {pastConvos.map((convo) => (
                <div key={convo.id} className="flex items-center group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { loadConversation(convo.id); clearThoughts(); setHistoryOpen(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { loadConversation(convo.id); clearThoughts(); setHistoryOpen(false); } }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground/80 truncate">{convo.title}</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto flex-shrink-0">
                      {new Date(convo.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteConversation(convo.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages — centered single column */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {messages.length === 0 && (
            <motion.div
              className="flex flex-col items-center justify-center text-center py-24"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                What do you want to know?
              </h1>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ask about revenue, margins, customers, suppliers, production — anything in your data.
              </p>
            </motion.div>
          )}

          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === "user" ? handleEdit : undefined}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Inline thinking steps */}
          {isLoading && <div className="mt-4"><InlineThinking /></div>}
        </div>
      </div>

      {/* Input — pinned bottom, centered */}
      <div className="border-t border-border/50 bg-background">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            isLoading={isLoading}
            editValue={editValue}
            onEditClear={() => setEditValue(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
