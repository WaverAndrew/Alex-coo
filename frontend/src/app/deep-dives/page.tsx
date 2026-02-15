"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, Clock, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { connectThoughtStream } from "@/lib/websocket";
import { useDeepDiveStore } from "@/lib/store";
import { DEMO_DEEP_DIVES } from "./_data";

export default function DeepDivesPage() {
  const [mounted, setMounted] = useState(false);
  const savedDives = useDeepDiveStore((s) => s.dives);
  const deleteDeepDive = useDeepDiveStore((s) => s.deleteDeepDive);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  // Merge saved + demos into one flat list, saved first
  const allDives = [
    ...savedDives.map((d) => ({ ...d, deletable: true })),
    ...DEMO_DEEP_DIVES.map((d) => ({ ...d, deletable: false })),
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Deep Dives</h1>
          <p className="text-sm text-muted-foreground">
            In-depth analyses. Click to read the full report.
          </p>
        </motion.div>

        {allDives.length === 0 && (
          <div className="text-center py-20">
            <FileSearch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No deep dives yet. Save one from a chat analysis.</p>
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
