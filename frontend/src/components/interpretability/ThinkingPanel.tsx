"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { useThoughtStore } from "@/lib/store";
import { ThoughtStep } from "./ThoughtStep";

export function ThinkingPanel() {
  const { thoughts, isProcessing } = useThoughtStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-xl overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Brain className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">
          Alex&apos;s Reasoning
        </h2>
        {isProcessing && (
          <motion.div
            className="ml-auto flex items-center gap-1.5"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary">Processing</span>
          </motion.div>
        )}
      </div>

      {/* Thought list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        <AnimatePresence mode="popLayout">
          {thoughts.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Brain className="w-6 h-6 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Ask me something
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                I&apos;ll show my reasoning here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {thoughts.map((thought, idx) => (
                <ThoughtStep
                  key={`${thought.timestamp.getTime()}-${idx}`}
                  thought={thought}
                  index={idx}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
