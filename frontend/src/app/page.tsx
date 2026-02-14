"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/charts/MetricCard";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Brain, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MetricSummary, ChartConfig } from "@/lib/types";
import { connectThoughtStream } from "@/lib/websocket";

const DEMO_METRICS: MetricSummary[] = [
  {
    label: "Monthly Revenue",
    value: 847500,
    previousValue: 792000,
    format: "currency",
    trend: "up",
    trendPercent: 7.0,
    sparklineData: [65, 72, 68, 74, 80, 78, 85, 82, 88, 92, 87, 95],
    unit: "\u20AC",
  },
  {
    label: "Orders",
    value: 342,
    previousValue: 318,
    format: "number",
    trend: "up",
    trendPercent: 7.5,
    sparklineData: [28, 32, 30, 35, 33, 38, 36, 40, 37, 42, 39, 45],
  },
  {
    label: "Avg Order Value",
    value: 2478,
    previousValue: 2490,
    format: "currency",
    trend: "down",
    trendPercent: 0.5,
    sparklineData: [2500, 2480, 2520, 2460, 2490, 2470, 2510, 2440, 2480, 2460, 2490, 2478],
    unit: "\u20AC",
  },
  {
    label: "Online Share",
    value: 36,
    previousValue: 28,
    format: "percent",
    trend: "up",
    trendPercent: 28.6,
    sparklineData: [15, 17, 19, 22, 24, 26, 28, 30, 32, 33, 35, 36],
  },
];

const REVENUE_CHART: ChartConfig = {
  type: "area",
  title: "Revenue Trend (Last 12 Months)",
  data: [
    { month: "Feb", revenue: 620000 },
    { month: "Mar", revenue: 680000 },
    { month: "Apr", revenue: 710000 },
    { month: "May", revenue: 690000 },
    { month: "Jun", revenue: 740000 },
    { month: "Jul", revenue: 720000 },
    { month: "Aug", revenue: 680000 },
    { month: "Sep", revenue: 760000 },
    { month: "Oct", revenue: 890000 },
    { month: "Nov", revenue: 920000 },
    { month: "Dec", revenue: 850000 },
    { month: "Jan", revenue: 847500 },
  ],
  xKey: "month",
  yKeys: ["revenue"],
  colors: ["#3b82f6"],
};

const INSIGHTS = [
  { id: "1", text: "Sofa margins have dropped to 28% from 42% - foam costs from Tessuti Milano are up 18% since October.", severity: "warning" as const },
  { id: "2", text: "Online channel now at 36% of revenue - up from 15% before the website relaunch. Strong momentum.", severity: "info" as const },
  { id: "3", text: "Rossi Interiors hasn't ordered since November. They're 12% of our revenue - worth a check-in.", severity: "warning" as const },
  { id: "4", text: "Showroom 3 continues to underperform: highest discounts (12% avg) and lowest customer ratings (3.4).", severity: "warning" as const },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HubPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Greeting */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening at <span className="text-foreground font-medium">Bella Casa Furniture</span>
            </p>
          </motion.div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {DEMO_METRICS.map((metric, idx) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                format={metric.format}
                trend={metric.trend}
                trendPercent={metric.trendPercent}
                sparklineData={metric.sparklineData}
                unit={metric.unit}
                delay={idx * 150}
              />
            ))}
          </div>

          {/* Chart + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <ChartRenderer config={REVENUE_CHART} height={280} />
            </div>
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-medium text-foreground">Alex&apos;s Insights</h3>
              </div>
              <div className="space-y-3">
                {INSIGHTS.map((insight, idx) => (
                  <motion.div
                    key={insight.id}
                    className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
                  >
                    <div className={`flex-shrink-0 w-1 rounded-full ${insight.severity === "warning" ? "bg-warning" : "bg-primary"}`} />
                    <p className="text-xs text-foreground/80 leading-relaxed">{insight.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div
            className="glass rounded-xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-medium text-foreground">Ask Alex</h3>
              </div>
              <Link
                href="/chat"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Open chat <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["How are margins trending?", "Compare our showrooms", "Who are our top customers?", "Show the seasonal pattern in beds"].map((q) => (
                <Link
                  key={q}
                  href={`/chat?q=${encodeURIComponent(q)}`}
                  className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border transition-all duration-200"
                >
                  {q}
                </Link>
              ))}
            </div>
          </motion.div>
      </div>
    </div>
  );
}
