"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, LayoutDashboard, FileSearch, Check } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Markdown } from "@/components/chat/Markdown";
import { useDashboardStore, useDeepDiveStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasCharts = !isUser && message.charts && message.charts.length > 0;
  const isLongResponse = !isUser && message.content.length > 300;
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const createDeepDive = useDeepDiveStore((s) => s.createDeepDive);
  const [savedDash, setSavedDash] = useState(false);
  const [savedDive, setSavedDive] = useState(false);

  function extractTitle(): string {
    // Find the first meaningful line — skip empty lines and short ones
    const lines = message.content.split("\n").filter((l) => l.trim().length > 5);
    const firstLine = (lines[0] || "Analysis")
      .replace(/^#+\s*/, "")   // remove markdown headings
      .replace(/\*\*/g, "")     // remove bold markers
      .replace(/^(here'?s?|let me|take a look|ok,?\s*)/i, "") // remove filler starts
      .trim();
    // Truncate at first sentence or 60 chars
    const dotIdx = firstLine.indexOf(".");
    if (dotIdx > 10 && dotIdx < 60) return firstLine.slice(0, dotIdx + 1);
    return firstLine.slice(0, 60) + (firstLine.length > 60 ? "..." : "");
  }

  function handleSaveDashboard() {
    if (!message.charts || message.charts.length === 0) return;
    createDashboard(extractTitle(), message.content.slice(0, 200), message.charts);
    setSavedDash(true);
  }

  function handleSaveDeepDive() {
    createDeepDive(extractTitle(), message.content, message.charts || []);
    setSavedDive(true);
  }

  return (
    <motion.div
      className={cn("flex gap-3 max-w-full", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-background" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3",
          isUser
            ? "bg-foreground text-background"
            : "bg-muted/50"
        )}
      >
        {isUser ? (
          <p className="text-sm text-background">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}

        {hasCharts && (
          <div className="mt-3 space-y-3">
            {message.charts!.map((chart, idx) => (
              <ChartRenderer key={idx} config={chart} height={220} />
            ))}

            {/* Save buttons */}
            <div className="pt-2 flex justify-end gap-2 flex-wrap">
              {savedDash ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                  <Check className="w-3 h-3" /> Dashboard saved
                </span>
              ) : (
                <button
                  onClick={handleSaveDashboard}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  Save as Dashboard
                </button>
              )}
              {savedDive ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                  <Check className="w-3 h-3" /> Deep Dive saved
                </span>
              ) : (
                <button
                  onClick={handleSaveDeepDive}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors"
                >
                  <FileSearch className="w-3 h-3" />
                  Save as Deep Dive
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save as Deep Dive for long text-only responses (no charts) */}
        {isLongResponse && !hasCharts && (
          <div className="pt-2 flex justify-end">
            {savedDive ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                <Check className="w-3 h-3" /> Deep Dive saved
              </span>
            ) : (
              <button
                onClick={handleSaveDeepDive}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors"
              >
                <FileSearch className="w-3 h-3" />
                Save as Deep Dive
              </button>
            )}
          </div>
        )}

        <p
          className={cn(
            "text-[10px] mt-2",
            isUser ? "text-background/60 text-right" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
