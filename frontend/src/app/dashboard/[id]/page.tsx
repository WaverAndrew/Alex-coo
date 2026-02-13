"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { ArrowLeft, Pin, PinOff, Trash2, Pencil, X } from "lucide-react";
import { connectThoughtStream } from "@/lib/websocket";
import { useActiveDashboardStore, useDashboardStore } from "@/lib/store";
import type { ChartConfig } from "@/lib/types";
import Link from "next/link";

interface DemoDashboard {
  id: string;
  title: string;
  description: string;
  charts: ChartConfig[];
  pinned: boolean;
}

const DEMO_DASHBOARDS: Record<string, DemoDashboard> = {
  "demo-1": {
    id: "demo-1",
    title: "Revenue Overview",
    description: "Monthly revenue trends, channel breakdown, and top products",
    pinned: true,
    charts: [
      {
        type: "area",
        title: "Monthly Revenue (2024)",
        data: [
          { month: "Jan", revenue: 620000 },
          { month: "Feb", revenue: 680000 },
          { month: "Mar", revenue: 710000 },
          { month: "Apr", revenue: 690000 },
          { month: "May", revenue: 740000 },
          { month: "Jun", revenue: 720000 },
          { month: "Jul", revenue: 680000 },
          { month: "Aug", revenue: 760000 },
          { month: "Sep", revenue: 890000 },
          { month: "Oct", revenue: 920000 },
          { month: "Nov", revenue: 850000 },
          { month: "Dec", revenue: 847500 },
        ],
        xKey: "month",
        yKeys: ["revenue"],
        colors: ["#2563eb"],
      },
      {
        type: "pie",
        title: "Revenue by Channel",
        data: [
          { channel: "Online", revenue: 305100 },
          { channel: "Showroom 1", revenue: 186450 },
          { channel: "Showroom 2", revenue: 152550 },
          { channel: "Showroom 3", revenue: 67800 },
          { channel: "Wholesale", revenue: 135600 },
        ],
        xKey: "channel",
        yKeys: ["revenue"],
      },
      {
        type: "bar",
        title: "Top 5 Products by Revenue",
        data: [
          { product: "Milano Sofa", revenue: 245000 },
          { product: "Firenze Bed", revenue: 198000 },
          { product: "Roma Table", revenue: 167000 },
          { product: "Venezia Chair", revenue: 134000 },
          { product: "Toscana Storage", revenue: 103000 },
        ],
        xKey: "product",
        yKeys: ["revenue"],
        colors: ["#0891b2"],
      },
    ],
  },
  "demo-2": {
    id: "demo-2",
    title: "Showroom Comparison",
    description: "Performance metrics across all three showrooms",
    pinned: false,
    charts: [
      {
        type: "bar",
        title: "Revenue by Showroom",
        data: [
          { showroom: "Showroom 1", revenue: 186450 },
          { showroom: "Showroom 2", revenue: 152550 },
          { showroom: "Showroom 3", revenue: 67800 },
        ],
        xKey: "showroom",
        yKeys: ["revenue"],
        colors: ["#2563eb"],
      },
      {
        type: "bar",
        title: "Average Discount Rate",
        data: [
          { showroom: "Showroom 1", discount: 5.0 },
          { showroom: "Showroom 2", discount: 7.0 },
          { showroom: "Showroom 3", discount: 11.8 },
        ],
        xKey: "showroom",
        yKeys: ["discount"],
        colors: ["#d97706"],
      },
      {
        type: "bar",
        title: "Customer Rating",
        data: [
          { showroom: "Showroom 1", rating: 4.3 },
          { showroom: "Showroom 2", rating: 4.1 },
          { showroom: "Showroom 3", rating: 3.4 },
        ],
        xKey: "showroom",
        yKeys: ["rating"],
        colors: ["#16a34a"],
      },
    ],
  },
  "demo-3": {
    id: "demo-3",
    title: "Customer Insights",
    description: "Customer segmentation, VIP concentration, and retention",
    pinned: true,
    charts: [
      {
        type: "pie",
        title: "Customer Segments",
        data: [
          { segment: "VIP", count: 40 },
          { segment: "Regular", count: 480 },
          { segment: "New", count: 280 },
        ],
        xKey: "segment",
        yKeys: ["count"],
      },
      {
        type: "bar",
        title: "Top 5 Customers by Revenue",
        data: [
          { customer: "Rossi Interiors", revenue: 101700 },
          { customer: "Milano Design Hub", revenue: 68400 },
          { customer: "Hotel Belvedere", revenue: 54200 },
          { customer: "Casa Moderna", revenue: 42100 },
          { customer: "Studio Elegante", revenue: 38900 },
        ],
        xKey: "customer",
        yKeys: ["revenue"],
        colors: ["#7c3aed"],
      },
    ],
  },
};

export default function DashboardViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = params.id as string;
  const demoDashboard = DEMO_DASHBOARDS[id];
  const savedDashboards = useDashboardStore((s) => s.dashboards);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);
  const savedDashboard = savedDashboards.find((d) => d.id === id);
  const isDeletable = !!savedDashboard; // only saved (non-demo) dashboards can be deleted

  // Resolve: saved dashboard from store, or demo dashboard
  const sourceDashboard = savedDashboard || demoDashboard;

  // Active dashboard store — source of truth for live charts
  const activeDashboard = useActiveDashboardStore((s) => s.dashboard);
  const setActiveDashboard = useActiveDashboardStore((s) => s.setDashboard);
  const removeChart = useActiveDashboardStore((s) => s.removeChart);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();

    if (sourceDashboard) {
      setPinned(sourceDashboard.pinned);
      setActiveDashboard({
        id: sourceDashboard.id,
        title: sourceDashboard.title,
        charts: sourceDashboard.charts,
      });
    }

    return () => {
      disconnect();
      setActiveDashboard(null);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  if (!sourceDashboard) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">Dashboard not found</h2>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground underline">
              Back to dashboards
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Use live charts from store (agent can update these), fallback to demo
  const liveCharts = activeDashboard?.charts ?? sourceDashboard.charts;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Toolbar */}
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{sourceDashboard.title}</h1>
                <p className="text-sm text-muted-foreground">{sourceDashboard.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPinned(!pinned)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border transition-colors"
              >
                {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {pinned ? "Unpin" : "Pin"}
              </button>
              {isDeletable && (
                <button
                  onClick={() => { deleteDashboard(id); router.push("/dashboard"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/80 hover:text-destructive bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </motion.div>

          {/* Chart Grid — reactive to store updates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {liveCharts.map((chart, idx) => (
                <motion.div
                  key={`${chart.title}-${idx}`}
                  className={`relative group ${liveCharts.length === 1 || (idx === 0 && liveCharts.length === 3) ? "lg:col-span-2" : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  layout
                >
                  <ChartRenderer config={chart} height={320} />
                  {/* Per-chart actions on hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        // Open the floating chat bar with an edit request for this chart
                        const event = new CustomEvent("edit-chart", {
                          detail: { index: idx, title: chart.title, type: chart.type },
                        });
                        window.dispatchEvent(event);
                      }}
                      className="w-7 h-7 rounded-lg bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors shadow-sm"
                      title={`Edit "${chart.title}"`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeChart(idx)}
                      className="w-7 h-7 rounded-lg bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background transition-colors shadow-sm"
                      title="Remove chart"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {liveCharts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">No charts yet. Use the bar below to ask Alex to add some.</p>
            </div>
          )}
        </div>
      </main>
      <AgentStatusBar />
    </div>
  );
}
