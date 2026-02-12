"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/lib/types";

interface MetricCardProps {
  label: string;
  value: number;
  format?: "currency" | "number" | "percent";
  trend: TrendDirection;
  trendPercent: number;
  sparklineData: number[];
  unit?: string;
  delay?: number;
}

function formatValue(value: number, format: string, unit?: string): string {
  switch (format) {
    case "currency":
      if (value >= 1_000_000) {
        return `${unit || "$"}${(value / 1_000_000).toFixed(1)}M`;
      }
      if (value >= 1_000) {
        return `${unit || "$"}${(value / 1_000).toFixed(1)}K`;
      }
      return `${unit || "$"}${value.toLocaleString()}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
      }
      return value.toLocaleString();
  }
}

function useCountUp(end: number, duration: number = 1500, delay: number = 0): number {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = Date.now() + delay;

    function animate() {
      const now = Date.now();
      if (now < startTime) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(end * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, delay]);

  return current;
}

export function MetricCard({
  label,
  value,
  format = "number",
  trend,
  trendPercent,
  sparklineData,
  unit,
  delay = 0,
}: MetricCardProps) {
  const animatedValue = useCountUp(value, 1500, delay);

  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
      ? "text-destructive"
      : "text-muted-foreground";

  const trendBgColor =
    trend === "up"
      ? "bg-success/10"
      : trend === "down"
      ? "bg-destructive/10"
      : "bg-muted/50";

  const sparkColor =
    trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#94a3b8";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      className="glass rounded-xl p-5 hover:animate-pulse-glow transition-all duration-300 cursor-default group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <SparklineChart data={sparklineData} color={sparkColor} width={72} height={28} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {formatValue(animatedValue, format, unit)}
          </p>
          <div
            className={cn(
              "inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
              trendBgColor,
              trendColor
            )}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trendPercent).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
