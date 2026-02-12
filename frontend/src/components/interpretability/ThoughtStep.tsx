"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Database,
  Lightbulb,
  BarChart3,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ThoughtEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ThoughtStepProps {
  thought: ThoughtEvent;
  index: number;
}

const ICON_MAP = {
  thinking: { icon: Brain, color: "text-foreground", bg: "bg-muted" },
  executing_sql: { icon: Database, color: "text-amber-600", bg: "bg-amber-50" },
  found_insight: { icon: Lightbulb, color: "text-green-600", bg: "bg-green-50" },
  generating_chart: { icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
  error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
};

export function ThoughtStep({ thought, index }: ThoughtStepProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false);

  const config = ICON_MAP[thought.type] || ICON_MAP.thinking;
  const Icon = config.icon;

  const hasSql = !!(
    thought.type === "executing_sql" &&
    thought.metadata?.sql &&
    typeof thought.metadata.sql === "string"
  );

  return (
    <motion.div
      className="flex gap-3 py-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5",
          config.bg
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground/80 leading-relaxed">
          {thought.content}
        </p>

        {/* Collapsible SQL block */}
        {hasSql && (
          <div className="mt-1.5">
            <button
              onClick={() => setSqlExpanded(!sqlExpanded)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {sqlExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              SQL Query
            </button>
            {sqlExpanded && (
              <motion.pre
                className="mt-1 p-2 rounded-md bg-background/80 border border-border/50 overflow-x-auto"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
              >
                <code className="text-[10px] text-primary/80 font-mono">
                  {String(thought.metadata?.sql ?? "")}
                </code>
              </motion.pre>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] text-muted-foreground/60 mt-1">
          {thought.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
