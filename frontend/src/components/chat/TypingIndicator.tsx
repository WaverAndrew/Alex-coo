"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { useThoughtStore } from "@/lib/store";

export function TypingIndicator() {
  const { thoughts, isProcessing } = useThoughtStore();

  const latestThought =
    thoughts.length > 0 ? thoughts[thoughts.length - 1] : null;

  const stepLabel =
    latestThought?.type === "thinking"
      ? "Alex is thinking..."
      : latestThought?.type === "executing_sql"
      ? "Alex is querying data..."
      : latestThought?.type === "generating_chart"
      ? "Alex is building a chart..."
      : latestThought?.type === "found_insight"
      ? "Alex found an insight..."
      : "Alex is analyzing...";

  return (
    <motion.div
      className="flex gap-3 justify-start max-w-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-shrink-0 mt-1">
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-background animate-pulse" />
        </div>
      </div>

      <div className="bg-muted/50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-foreground"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
        </div>
      </div>
    </motion.div>
  );
}
