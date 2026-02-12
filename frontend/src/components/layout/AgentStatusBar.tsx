"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";
import { useThoughtStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AgentStatusBar() {
  const { thoughts, isProcessing } = useThoughtStore();
  const [latestMessage, setLatestMessage] = useState<string>("Alex is ready");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (thoughts.length > 0) {
      const latest = thoughts[thoughts.length - 1];
      setLatestMessage(latest.content);
      setVisible(true);

      const timer = setTimeout(() => {
        if (!isProcessing) {
          setVisible(false);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [thoughts, isProcessing]);

  useEffect(() => {
    if (isProcessing) {
      setVisible(true);
    }
  }, [isProcessing]);

  const statusColor = isProcessing
    ? thoughts.length > 0 &&
      thoughts[thoughts.length - 1].type === "executing_sql"
      ? "bg-warning"
      : "bg-primary"
    : "bg-success";

  const statusLabel = isProcessing
    ? thoughts.length > 0 &&
      thoughts[thoughts.length - 1].type === "executing_sql"
      ? "Executing"
      : "Thinking"
    : "Ready";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  statusColor
                )}
              />
              <Brain className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                {statusLabel}
              </span>
            </div>
            <div className="h-3 w-px bg-border" />
            <motion.p
              key={latestMessage}
              className="text-xs text-muted-foreground truncate flex-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {latestMessage}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
