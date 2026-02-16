"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSearch, Clock, ChevronRight, Trash2, Plus, Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectThoughtStream } from "@/lib/websocket";
import { useDeepDiveStore, useThoughtStore } from "@/lib/store";
import { createDeepDive, getDeepDiveStatus } from "@/lib/api";
import { DEMO_DEEP_DIVES } from "./_data";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/lib/types";

interface ActiveDive {
  id: string;
  topic: string;
  status: "processing" | "complete" | "error";
  progress: number;
  phase: string;
}

const PHASE_LABELS: Record<string, string> = {
  plan: "Planning research strategy",
  gather: "Gathering data",
  analyze: "Cross-referencing findings",
  report: "Synthesizing report",
};

export default function DeepDivesPage() {
  const [mounted, setMounted] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [topic, setTopic] = useState("");
  const [activeDives, setActiveDives] = useState<ActiveDive[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const savedDives = useDeepDiveStore((s) => s.dives);
  const saveDive = useDeepDiveStore((s) => s.createDeepDive);
  const deleteDeepDive = useDeepDiveStore((s) => s.deleteDeepDive);
  const thoughts = useThoughtStore((s) => s.thoughts);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  // Listen to WebSocket deep_dive_progress events to update active dives
  useEffect(() => {
    if (!mounted) return;
    const latest = thoughts[thoughts.length - 1];
    if (!latest?.metadata) return;
    const meta = latest.metadata as Record<string, unknown>;
    const diveId = meta.dive_id as string | undefined;
    if (!diveId) return;

    setActiveDives((prev) => {
      const idx = prev.findIndex((d) => d.id === diveId);
      if (idx === -1) return prev;
      const updated = [...prev];

      if (latest.type === ("deep_dive_complete" as string)) {
        updated[idx] = { ...updated[idx], status: "complete", progress: 100, phase: "complete" };
      } else if (latest.type === ("deep_dive_error" as string)) {
        updated[idx] = { ...updated[idx], status: "error", progress: 0, phase: "error" };
      } else {
        updated[idx] = {
          ...updated[idx],
          progress: (meta.progress as number) || updated[idx].progress,
          phase: (meta.phase as string) || updated[idx].phase,
        };
      }
      return updated;
    });
  }, [thoughts, mounted]);

  // Poll for completion and auto-save
  const pollForCompletion = useCallback(
    async (diveId: string) => {
      const POLL_INTERVAL = 3000;
      const MAX_POLLS = 120; // ~6 minutes max
      let polls = 0;

      const poll = async () => {
        polls++;
        if (polls > MAX_POLLS) return;

        try {
          const status = await getDeepDiveStatus(diveId);

          setActiveDives((prev) =>
            prev.map((d) =>
              d.id === diveId
                ? { ...d, status: status.status as ActiveDive["status"], progress: status.progress }
                : d
            )
          );

          if (status.status === "complete") {
            // Save to persistent store
            const charts: ChartConfig[] = (status.charts || []).map((c) => ({
              type: c.type as ChartConfig["type"],
              title: c.title,
              data: c.data as Record<string, unknown>[],
              xKey: c.xKey,
              yKeys: c.yKeys,
              colors: c.colors,
            }));
            const saved = saveDive(status.title || status.topic, status.content || "", charts);

            // Remove from active and navigate
            setTimeout(() => {
              setActiveDives((prev) => prev.filter((d) => d.id !== diveId));
              router.push(`/deep-dives/${saved.id}`);
            }, 1500);
            return;
          }

          if (status.status === "error") {
            setTimeout(() => {
              setActiveDives((prev) => prev.filter((d) => d.id !== diveId));
            }, 5000);
            return;
          }

          setTimeout(poll, POLL_INTERVAL);
        } catch {
          setTimeout(poll, POLL_INTERVAL);
        }
      };

      setTimeout(poll, POLL_INTERVAL);
    },
    [saveDive, router]
  );

  const handleCreate = useCallback(async () => {
    const t = topic.trim();
    if (!t) return;
    setTopic("");
    setShowInput(false);

    try {
      const res = await createDeepDive(t);
      setActiveDives((prev) => [
        { id: res.id, topic: t, status: "processing", progress: res.progress || 5, phase: "plan" },
        ...prev,
      ]);
      pollForCompletion(res.id);
    } catch {
      // Show transient error
      const errId = `err-${Date.now()}`;
      setActiveDives((prev) => [
        { id: errId, topic: t, status: "error", progress: 0, phase: "error" },
        ...prev,
      ]);
      setTimeout(() => {
        setActiveDives((prev) => prev.filter((d) => d.id !== errId));
      }, 5000);
    }
  }, [topic, pollForCompletion]);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  if (!mounted) return null;

  const allDives = [
    ...savedDives.map((d) => ({ ...d, deletable: true })),
    ...DEMO_DEEP_DIVES.map((d) => ({ ...d, deletable: false })),
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          className="mb-8 flex items-start justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Deep Dives</h1>
            <p className="text-sm text-muted-foreground">
              In-depth analyses. Click to read the full report.
            </p>
          </div>
          <button
            onClick={() => setShowInput((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              showInput
                ? "bg-muted text-muted-foreground"
                : "bg-foreground text-background hover:opacity-90"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </motion.div>

        {/* Create input */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="flex items-center gap-2 p-1 rounded-xl border border-border bg-muted/20">
                <input
                  ref={inputRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowInput(false);
                  }}
                  placeholder="What should Alex research? e.g. &quot;Sofa margin trends over the last 6 months&quot;"
                  className="flex-1 text-sm bg-transparent px-3 py-2.5 outline-none text-foreground placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleCreate}
                  disabled={!topic.trim()}
                  className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                    topic.trim() ? "bg-foreground text-background" : "text-muted-foreground/30"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active / in-progress dives */}
        <AnimatePresence>
          {activeDives.map((dive) => (
            <motion.div
              key={dive.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="mb-3"
            >
              <div className="relative overflow-hidden rounded-xl border border-border bg-background px-5 py-4">
                {/* Progress bar background */}
                {dive.status === "processing" && (
                  <motion.div
                    className="absolute inset-0 bg-foreground/[0.03]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${dive.progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                )}
                <div className="relative flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {dive.status === "processing" && (
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    )}
                    {dive.status === "complete" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                    {dive.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{dive.topic}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dive.status === "processing" && (
                        <>{PHASE_LABELS[dive.phase] || "Processing"} · {dive.progress}%</>
                      )}
                      {dive.status === "complete" && "Complete — opening report..."}
                      {dive.status === "error" && "Analysis failed. Try again."}
                    </p>
                  </div>
                  {dive.status === "processing" && (
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
                      {dive.progress}%
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Saved + demo dives */}
        {allDives.length === 0 && activeDives.length === 0 && (
          <div className="text-center py-20">
            <FileSearch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No deep dives yet. Click &ldquo;New&rdquo; to start one.</p>
          </div>
        )}

        <div className="space-y-3">
          {allDives.map((dive, idx) => (
            <motion.div
              key={dive.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Link href={`/deep-dives/${dive.id}`}>
                <div className="group flex items-start gap-4 px-5 py-4 rounded-xl border border-border hover:border-foreground/10 hover:shadow-sm bg-background transition-all cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-foreground/80 transition-colors">
                      {dive.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {dive.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(dive.createdAt).toLocaleDateString()}
                      </span>
                      {dive.charts.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {dive.charts.length} chart{dive.charts.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                    {dive.deletable && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDeepDive(dive.id); }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
