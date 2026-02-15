"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Send, Brain, Loader2 } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { connectThoughtStream, sendChatMessage } from "@/lib/websocket";
import { useChatStore, useThoughtStore, useDeepDiveStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/lib/types";
import { DEMO_DEEP_DIVES } from "../_data";

interface FollowUp {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
}

export default function DeepDiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [mounted, setMounted] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useChatStore((s) => s.sessionId);
  const { clearThoughts, setProcessing } = useThoughtStore();
  const thoughts = useThoughtStore((s) => s.thoughts);
  const savedDives = useDeepDiveStore((s) => s.dives);

  // Find dive — check saved first, then demos
  const savedMatch = savedDives.find((d) => d.id === id);
  const demoMatch = DEMO_DEEP_DIVES.find((d) => d.id === id);
  const dive = savedMatch ? { ...savedMatch, followUpSuggestions: [] as string[] } : demoMatch;

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [followUps, thoughts]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || loading || !dive) return;
      setInput("");

      setFollowUps((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: msg }]);
      setLoading(true);
      clearThoughts();
      setProcessing(true);

      const contextMessage = `${msg}\n\n[CONTEXT: Follow-up to the analysis "${dive.title}". Summary: ${dive.summary}]`;

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
          { id: `a-${Date.now()}`, role: "assistant", content: response.reply || "", charts: charts.length > 0 ? charts : undefined },
        ]);
      } catch {
        setFollowUps((prev) => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: "Something went wrong. Try again?" }]);
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    },
    [input, loading, dive, sessionId, clearThoughts, setProcessing]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  if (!mounted) return null;

  if (!dive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Deep dive not found</p>
          <button onClick={() => router.push("/deep-dives")} className="text-sm text-foreground underline">Back</button>
        </div>
      </div>
    );
  }

  const activeThoughts = loading ? thoughts.slice(-4) : [];

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back button */}
        <motion.button
          onClick={() => router.push("/deep-dives")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Deep Dives
        </motion.button>

        {/* Title + meta */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">{dive.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(dive.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* Charts */}
        {dive.charts && dive.charts.length > 0 && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {dive.charts.map((chart, i) => (
              <ChartRenderer key={i} config={chart} height={260} />
            ))}
          </motion.div>
        )}

        {/* Full analysis content */}
        <motion.article
          className="prose-like mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Markdown content={dive.fullContent} />
        </motion.article>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Follow-up section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ask a follow-up</h2>

          {/* Suggestion chips */}
          {followUps.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(dive.followUpSuggestions || ["Tell me more", "What should we do next?", "How does this compare historically?"]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border/50 transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Thread */}
          <div ref={scrollRef} className="space-y-3 mb-4">
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
                  ) : fu.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 pl-8">
                {activeThoughts.map((t, i) => (
                  <motion.p key={i} className="text-xs text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {t.content}
                  </motion.p>
                ))}
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up..."
              disabled={loading}
              className="flex-1 text-sm bg-muted/30 rounded-lg px-3 py-2.5 outline-none text-foreground placeholder:text-muted-foreground/50 border border-border focus:border-foreground/20 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                input.trim() && !loading ? "bg-foreground text-background" : "text-muted-foreground/30"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
