"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/charts/MetricCard";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ChevronRight, Users } from "lucide-react";
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
  colors: ["#818cf8"],
};

const INSIGHTS = [
  {
    id: "1",
    title: "Sofa margins dropping fast",
    text: "Down from 42% to 28% — foam costs from Tessuti Milano up 18% since October",
    icon: TrendingDown,
    glowColor: "bg-destructive",
    glowClass: "glow-destructive",
    iconColor: "text-destructive",
    action: "Analyze sofa margins in detail",
  },
  {
    id: "2",
    title: "Rossi Interiors gone quiet",
    text: "Our top customer (12% of revenue) hasn't ordered since November — 67 days silence",
    icon: Users,
    glowColor: "bg-destructive",
    glowClass: "glow-destructive",
    iconColor: "text-destructive",
    action: "Show Rossi Interiors order history",
  },
  {
    id: "3",
    title: "Online channel surging",
    text: "Now at 36% of revenue, up from 15% pre-relaunch. Strong organic growth",
    icon: TrendingUp,
    glowColor: "bg-success",
    glowClass: "glow-success",
    iconColor: "text-success",
    action: "Break down online channel performance",
  },
  {
    id: "4",
    title: "Showroom 3 needs attention",
    text: "Highest discounts (12% avg), lowest ratings (3.4/5), weakest revenue",
    icon: AlertTriangle,
    glowColor: "bg-warning",
    glowClass: "glow-warning",
    iconColor: "text-warning",
    action: "Compare all three showrooms",
  },
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
    <div className="min-h-screen relative">
      <AnimatedBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Hero greeting — serif for elegance */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-display italic text-foreground tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Bella Casa Furniture
          </p>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
              delay={idx * 100}
            />
          ))}
        </div>

        {/* Insights — prominent cards grid */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            What Alex is watching
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INSIGHTS.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + idx * 0.08 }}
                >
                  <Link href={`/chat?q=${encodeURIComponent(insight.action)}`}>
                    <div className="group glass rounded-xl p-4 cursor-pointer transition-all duration-300 overflow-hidden relative">
                      {/* Glowing left border indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${insight.glowColor} ${insight.glowClass}`} />
                      <div className="flex items-start gap-3 pl-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent`}>
                          <Icon className={`w-4 h-4 ${insight.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground mb-0.5">{insight.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Revenue chart */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <ChartRenderer config={REVENUE_CHART} height={300} />
        </motion.div>

        {/* Quick ask */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick questions</h2>
            <Link href="/chat" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto">
              Open chat <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["How are margins trending?", "Compare our showrooms", "Who are our top customers?", "Show the seasonal pattern in beds", "Supply chain status"].map((q) => (
              <Link
                key={q}
                href={`/chat?q=${encodeURIComponent(q)}`}
                className="px-3.5 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground bg-background border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-200"
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
