"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { BarChart3, Pin, Plus, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { connectThoughtStream } from "@/lib/websocket";
import { useDashboardStore } from "@/lib/store";
import type { Dashboard, ChartConfig } from "@/lib/types";

const DEMO_DASHBOARDS: Dashboard[] = [
  {
    id: "demo-1",
    title: "Revenue Overview",
    description: "Monthly revenue trends, channel breakdown, and top products",
    charts: [
      { type: "area", title: "Monthly Revenue", data: [], xKey: "month", yKeys: ["revenue"] },
      { type: "pie", title: "Channel Mix", data: [], xKey: "channel", yKeys: ["revenue"] },
      { type: "bar", title: "Top Products", data: [], xKey: "product", yKeys: ["revenue"] },
    ] as ChartConfig[],
    pinned: true,
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-28T14:30:00Z",
  },
  {
    id: "demo-2",
    title: "Showroom Comparison",
    description: "Performance metrics across all three showrooms",
    charts: [
      { type: "bar", title: "Revenue by Showroom", data: [], xKey: "showroom", yKeys: ["revenue"] },
      { type: "bar", title: "Avg Discount", data: [], xKey: "showroom", yKeys: ["discount"] },
    ] as ChartConfig[],
    pinned: false,
    createdAt: "2025-01-20T09:00:00Z",
    updatedAt: "2025-01-25T11:00:00Z",
  },
  {
    id: "demo-3",
    title: "Customer Insights",
    description: "Customer segmentation, VIP concentration, and retention metrics",
    charts: [
      { type: "pie", title: "Segment Breakdown", data: [], xKey: "segment", yKeys: ["count"] },
      { type: "bar", title: "Top 10 Customers", data: [], xKey: "customer", yKeys: ["revenue"] },
    ] as ChartConfig[],
    pinned: true,
    createdAt: "2025-01-10T16:00:00Z",
    updatedAt: "2025-01-22T08:45:00Z",
  },
];

export default function DashboardListPage() {
  const [mounted, setMounted] = useState(false);
  const savedDashboards = useDashboardStore((s) => s.dashboards);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);
  const togglePin = useDashboardStore((s) => s.togglePin);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  // Combine saved (from chat) + demos, saved first
  const allDashboards = [...savedDashboards, ...DEMO_DASHBOARDS];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <motion.div
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-foreground" />
                <h1 className="text-xl font-bold text-foreground">Dashboards</h1>
              </div>
              <p className="text-sm text-muted-foreground">Saved analyses and chart collections</p>
            </div>
            <Link
              href="/chat"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ask Alex to Build One
            </Link>
          </motion.div>

          {savedDashboards.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Created by Alex
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedDashboards.map((dashboard, idx) => (
                  <motion.div
                    key={dashboard.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Link href={`/dashboard/${dashboard.id}`}>
                      <div className="glass rounded-xl p-5 hover:shadow-md transition-all duration-200 group cursor-pointer h-full relative">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors pr-6">
                            {dashboard.title}
                          </h3>
                          <div className="flex items-center gap-1 absolute top-4 right-4">
                            {dashboard.pinned && <Pin className="w-3 h-3 text-foreground" />}
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDashboard(dashboard.id); }}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {dashboard.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground/60">
                            {dashboard.charts.length} chart{dashboard.charts.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {new Date(dashboard.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div>
            {savedDashboards.length > 0 && (
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Demo Dashboards
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_DASHBOARDS.map((dashboard, idx) => (
                <motion.div
                  key={dashboard.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (savedDashboards.length + idx) * 0.05 }}
                >
                  <Link href={`/dashboard/${dashboard.id}`}>
                    <div className="glass rounded-xl p-5 hover:shadow-md transition-all duration-200 group cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                          {dashboard.title}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {dashboard.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/60">
                          {dashboard.charts.length} chart{dashboard.charts.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {new Date(dashboard.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <AgentStatusBar />
    </div>
  );
}
