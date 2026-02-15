"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronRight, Trash2, Clock } from "lucide-react";
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
    pinned: false,
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
    pinned: false,
    createdAt: "2025-01-10T16:00:00Z",
    updatedAt: "2025-01-22T08:45:00Z",
  },
];

export default function DashboardListPage() {
  const [mounted, setMounted] = useState(false);
  const savedDashboards = useDashboardStore((s) => s.dashboards);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  const allDashboards = [
    ...savedDashboards.map((d) => ({ ...d, deletable: true })),
    ...DEMO_DASHBOARDS.map((d) => ({ ...d, deletable: false })),
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Dashboards</h1>
            <p className="text-sm text-muted-foreground">Chart collections and saved analyses</p>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </Link>
        </motion.div>

        {allDashboards.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">No dashboards yet. Ask Alex to build one from chat.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDashboards.map((dashboard, idx) => (
            <motion.div
              key={dashboard.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
            >
              <Link href={`/dashboard/${dashboard.id}`}>
                <div className="group rounded-xl border border-border hover:border-foreground/10 hover:shadow-sm bg-background p-5 transition-all cursor-pointer h-full relative">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground/80 transition-colors pr-8">
                      {dashboard.title}
                    </h3>
                    <div className="flex items-center gap-1 absolute top-4 right-4">
                      {dashboard.deletable && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDashboard(dashboard.id); }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                    {dashboard.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground/60">
                      {dashboard.charts.length} chart{dashboard.charts.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(dashboard.createdAt).toLocaleDateString()}
                    </span>
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
