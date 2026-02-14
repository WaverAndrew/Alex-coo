"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, TrendingDown, Users, ShoppingCart, ArrowRight, ChevronRight, Clock } from "lucide-react";
import { connectThoughtStream } from "@/lib/websocket";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  category: string;
  timestamp: string;
  actionLabel: string;
  chatQuestion: string;
}

const DEMO_ALERTS: AlertItem[] = [
  {
    id: "1",
    title: "Rossi Interiors hasn't ordered in 67 days",
    description: "Our top customer (12% of revenue, ~EUR 1.2M/year) last ordered on November 15, 2024. This is their longest gap since becoming a customer.",
    severity: "critical",
    category: "Customer Risk",
    timestamp: "2025-01-31T10:00:00Z",
    actionLabel: "Analyze Rossi Interiors",
    chatQuestion: "Tell me everything about Rossi Interiors - order history, what they buy, and when they typically order",
  },
  {
    id: "2",
    title: "Sofa margins dropped to 28%",
    description: "Down from 42% before October. Tessuti Milano's 18% foam price hike is the primary driver. At current trajectory, sofa margins could hit 25% by Q2.",
    severity: "critical",
    category: "Margin Alert",
    timestamp: "2025-01-30T14:00:00Z",
    actionLabel: "Deep dive on sofa costs",
    chatQuestion: "Break down the sofa margin squeeze - what changed, which products are hit hardest, and what are our options?",
  },
  {
    id: "3",
    title: "Showroom 3 rating at 3.4/5.0",
    description: "Consistently below Showroom 1 (4.3) and Showroom 2 (4.1). Average discount is 11.8% — highest across all showrooms — suggesting price pressure but poor value perception.",
    severity: "warning",
    category: "Operations",
    timestamp: "2025-01-29T09:00:00Z",
    actionLabel: "Compare showrooms",
    chatQuestion: "Compare all three showrooms - revenue, discounts, ratings, and top products. What's going wrong at Showroom 3?",
  },
  {
    id: "4",
    title: "Tessuti Milano delivery reliability at 65%",
    description: "On-time delivery dropped from 92% to 65% since October. This is causing production delays on all foam-dependent products.",
    severity: "warning",
    category: "Supply Chain",
    timestamp: "2025-01-28T16:00:00Z",
    actionLabel: "Supplier analysis",
    chatQuestion: "Show me Tessuti Milano's performance over time - on-time delivery, quality scores, and cost trends",
  },
  {
    id: "5",
    title: "Online channel growing faster than capacity",
    description: "Online now represents 36% of revenue (up from 15% pre-relaunch). Fulfillment times are creeping up. Consider expanding online operations.",
    severity: "info",
    category: "Growth",
    timestamp: "2025-01-27T11:00:00Z",
    actionLabel: "Explore online trends",
    chatQuestion: "How has the online channel grown since the website relaunch? Show me the trajectory and any operational bottlenecks",
  },
  {
    id: "6",
    title: "Bed sales peak approaching (Oct-Nov)",
    description: "Historical pattern shows 2.5x spike in bed sales during Oct-Nov. Last year we had stockout issues. Start production planning now.",
    severity: "info",
    category: "Seasonal",
    timestamp: "2025-01-26T08:00:00Z",
    actionLabel: "View bed seasonality",
    chatQuestion: "Show me the seasonal pattern in bed sales - monthly breakdown and year-over-year comparison",
  },
];

const SEVERITY_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  warning: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  info: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
};

export default function AlertsPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  if (!mounted) return null;

  const critical = DEMO_ALERTS.filter((a) => a.severity === "critical");
  const warning = DEMO_ALERTS.filter((a) => a.severity === "warning");
  const info = DEMO_ALERTS.filter((a) => a.severity === "info");

  function handleDive(alert: AlertItem) {
    router.push(`/chat?q=${encodeURIComponent(alert.chatQuestion)}`);
  }

  function renderAlert(alert: AlertItem, idx: number) {
    const config = SEVERITY_CONFIG[alert.severity];

    return (
      <motion.div
        key={alert.id}
        className={cn("rounded-xl border p-5 cursor-pointer group hover:shadow-md transition-all", config.border, config.bg)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.06 }}
        onClick={() => handleDive(alert)}
      >
        <div className="flex items-start gap-4">
          <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", config.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[10px] font-medium uppercase tracking-wider", config.color)}>
                {alert.category}
              </span>
              <span className="text-[10px] text-muted-foreground/50">
                <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                {new Date(alert.timestamp).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-foreground/80 transition-colors">
              {alert.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {alert.description}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">
              <span>{alert.actionLabel}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-8">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-foreground" />
              <h1 className="text-xl font-bold text-foreground">Alex&apos;s Alerts</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Things I&apos;m watching. Click any alert to dive deeper.
            </p>
          </motion.div>

          {/* Critical */}
          {critical.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3">
                Needs attention ({critical.length})
              </h2>
              <div className="space-y-3">
                {critical.map((a, i) => renderAlert(a, i))}
              </div>
            </div>
          )}

          {/* Warning */}
          {warning.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3">
                Watch closely ({warning.length})
              </h2>
              <div className="space-y-3">
                {warning.map((a, i) => renderAlert(a, i + critical.length))}
              </div>
            </div>
          )}

          {/* Info */}
          {info.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3">
                Worth knowing ({info.length})
              </h2>
              <div className="space-y-3">
                {info.map((a, i) => renderAlert(a, i + critical.length + warning.length))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
