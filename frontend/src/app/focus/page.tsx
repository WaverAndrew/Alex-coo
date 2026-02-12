"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { SparklineChart } from "@/components/charts/SparklineChart";
import {
  Target,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { connectThoughtStream } from "@/lib/websocket";
import type { FocusItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEMO_FOCUS_ITEMS: FocusItem[] = [
  {
    id: "1",
    metricName: "Sofa Gross Margin",
    currentValue: 28,
    previousValue: 42,
    threshold: { warning: 35, alert: 30 },
    status: "alert",
    trend: "down",
    trendPercent: -33.3,
    sparklineData: [42, 41, 40, 39, 38, 35, 32, 30, 29, 28],
    unit: "%",
    description: "Foam cost increase from Tessuti Milano driving margin compression",
    createdAt: "2024-10-15",
    updatedAt: "2025-01-31",
  },
  {
    id: "2",
    metricName: "Rossi Interiors Activity",
    currentValue: 67,
    previousValue: 30,
    threshold: { warning: 45, alert: 60 },
    status: "alert",
    trend: "up",
    trendPercent: 123,
    sparklineData: [10, 15, 20, 25, 30, 35, 40, 50, 58, 67],
    unit: "days since order",
    description: "Top customer (12% of revenue) - no orders since November",
    createdAt: "2024-12-01",
    updatedAt: "2025-01-31",
  },
  {
    id: "3",
    metricName: "Showroom 3 Rating",
    currentValue: 3.4,
    previousValue: 3.5,
    threshold: { warning: 3.8, alert: 3.5 },
    status: "alert",
    trend: "down",
    trendPercent: -2.9,
    sparklineData: [3.6, 3.5, 3.5, 3.4, 3.5, 3.3, 3.4, 3.4, 3.3, 3.4],
    unit: "/5.0",
    description: "Consistently below other showrooms (4.1, 4.3 avg)",
    createdAt: "2024-09-01",
    updatedAt: "2025-01-31",
  },
  {
    id: "4",
    metricName: "Online Revenue Share",
    currentValue: 36,
    previousValue: 32,
    threshold: { warning: 20, alert: 15 },
    status: "ok",
    trend: "up",
    trendPercent: 12.5,
    sparklineData: [15, 18, 22, 25, 28, 30, 32, 33, 35, 36],
    unit: "%",
    description: "Growing steadily since website relaunch in March 2024",
    createdAt: "2024-04-01",
    updatedAt: "2025-01-31",
  },
  {
    id: "5",
    metricName: "Monthly Revenue",
    currentValue: 847500,
    previousValue: 792000,
    threshold: { warning: 700000, alert: 600000 },
    status: "ok",
    trend: "up",
    trendPercent: 7.0,
    sparklineData: [720, 680, 740, 720, 760, 790, 850, 920, 850, 848],
    unit: "EUR",
    description: "Healthy growth trajectory",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-31",
  },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "alert":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-warning" />;
    default:
      return <CheckCircle className="w-4 h-4 text-success" />;
  }
}

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-3.5 h-3.5" />;
    case "down":
      return <TrendingDown className="w-3.5 h-3.5" />;
    default:
      return <Minus className="w-3.5 h-3.5" />;
  }
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === "EUR" || unit === "eur") {
    if (value >= 1_000_000) return `\u20AC${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `\u20AC${(value / 1_000).toFixed(0)}K`;
    return `\u20AC${value.toLocaleString()}`;
  }
  if (unit === "%" || unit === "/5.0") return `${value}${unit}`;
  if (unit.startsWith("days")) return `${value} days`;
  return `${value}`;
}

export default function FocusPage() {
  const [mounted, setMounted] = useState(false);
  const items = DEMO_FOCUS_ITEMS;

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  const alertItems = items.filter((i) => i.status === "alert");
  const warningItems = items.filter((i) => i.status === "warning");
  const okItems = items.filter((i) => i.status === "ok");

  const groups = [
    { label: "Alerts", items: alertItems, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" },
    { label: "Warnings", items: warningItems, color: "text-warning", bgColor: "bg-warning/10", borderColor: "border-warning/30" },
    { label: "Healthy", items: okItems, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30" },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-foreground" />
                <h1 className="text-xl font-bold text-foreground">Focus Board</h1>
              </div>
              <p className="text-sm text-muted-foreground">Metrics Alex is watching for you</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
              <Plus className="w-4 h-4" />
              Add Metric
            </button>
          </motion.div>

          {/* Status Groups */}
          <AnimatePresence>
            {groups.map((group, groupIdx) => (
              <motion.div
                key={group.label}
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: groupIdx * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", group.bgColor, group.color)}>
                    {group.label} ({group.items.length})
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      className={cn("glass rounded-xl p-5 border", group.borderColor)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: groupIdx * 0.1 + idx * 0.05 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={item.status} />
                          <h3 className="text-sm font-medium text-foreground">{item.metricName}</h3>
                        </div>
                        <SparklineChart
                          data={item.sparklineData}
                          color={item.status === "alert" ? "#ef4444" : item.status === "warning" ? "#f59e0b" : "#10b981"}
                          width={72}
                          height={28}
                        />
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xl font-bold text-foreground font-data">
                            {formatMetricValue(item.currentValue, item.unit)}
                          </p>
                          <div className={cn(
                            "inline-flex items-center gap-1 mt-1 text-xs",
                            item.trend === "up" && item.status === "ok" ? "text-success" :
                            item.trend === "down" && item.status !== "ok" ? "text-destructive" :
                            "text-muted-foreground"
                          )}>
                            <TrendIcon trend={item.trend} />
                            <span>{Math.abs(item.trendPercent).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.description}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
      <AgentStatusBar />
    </div>
  );
}
