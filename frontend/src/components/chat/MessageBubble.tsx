"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, LayoutDashboard, Check } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Markdown } from "@/components/chat/Markdown";
import { useDashboardStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasCharts = !isUser && message.charts && message.charts.length > 0;
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const [saved, setSaved] = useState(false);

  function handleSaveDashboard() {
    if (!message.charts || message.charts.length === 0) return;
    // Extract a title from the first line of the message
    const firstLine = message.content.split("\n")[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(0, 60);
    const title = firstLine || "Dashboard";
    createDashboard(title, message.content.slice(0, 200), message.charts);
    setSaved(true);
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

            {/* Save as Dashboard button */}
            <div className="pt-2 flex justify-end">
              {saved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Saved to Dashboards
                </span>
              ) : (
                <button
                  onClick={handleSaveDashboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Save as Dashboard
                </button>
              )}
            </div>
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
