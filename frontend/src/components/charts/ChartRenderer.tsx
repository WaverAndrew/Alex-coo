"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ChartConfig } from "@/lib/types";

const SupplyChainMap = dynamic(
  () => import("./SupplyChainMap").then((m) => m.SupplyChainMap),
  { ssr: false }
);

const DEFAULT_COLORS = ["#818cf8", "#22d3ee", "#34d399", "#fbbf24", "#c084fc", "#fb7185"];

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(19, 25, 40, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "10px",
  color: "#e8ecf4",
  fontSize: "12px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(12px)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTooltipValue(value: any) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(n)) return String(value ?? "");
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface ChartRendererProps {
  config: ChartConfig;
  height?: number;
  className?: string;
}

export function ChartRenderer({ config, height = 300, className }: ChartRendererProps) {
  const colors = useMemo(
    () => config.colors || DEFAULT_COLORS,
    [config.colors]
  );

  const formatTick = (v: number | string) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };

  const commonAxisProps = {
    stroke: "#7c859b",
    fontSize: 11,
    tickLine: false,
    axisLine: { stroke: "rgba(255, 255, 255, 0.06)" },
  };

  const gridProps = {
    strokeDasharray: "3 3",
    stroke: "rgba(255, 255, 255, 0.04)",
    vertical: false,
  };

  function renderChart() {
    switch (config.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={config.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={config.xKey} {...commonAxisProps} />
              <YAxis {...commonAxisProps} tickFormatter={formatTick} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTooltipValue} cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#7c859b" }} />
              {config.yKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % colors.length]}
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationBegin={idx * 100}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={config.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={config.xKey} {...commonAxisProps} />
              <YAxis {...commonAxisProps} tickFormatter={formatTick} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTooltipValue} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#7c859b" }} />
              {config.yKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[idx % colors.length], r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={800}
                  animationBegin={idx * 100}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={config.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                {config.yKeys.map((key, idx) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey={config.xKey} {...commonAxisProps} />
              <YAxis {...commonAxisProps} tickFormatter={formatTick} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTooltipValue} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#7c859b" }} />
              {config.yKeys.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  fill={`url(#gradient-${key})`}
                  animationDuration={800}
                  animationBegin={idx * 100}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.yKeys[0]}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                outerRadius={height / 3}
                innerRadius={height / 5}
                paddingAngle={2}
                animationDuration={800}
                stroke="none"
              >
                {config.data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={formatTooltipValue} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#7c859b" }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "geo":
        return <SupplyChainMap data={config.data} height={height} />;

      case "metric":
        const value = config.data[0]?.[config.yKeys[0]];
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-4xl font-bold text-foreground">{String(value ?? "--")}</p>
            <p className="text-sm text-muted-foreground mt-1">{config.title}</p>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Unsupported chart type: {config.type}
          </div>
        );
    }
  }

  return (
    <motion.div
      className={`glass rounded-xl p-4 ${className || ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {config.type !== "metric" && (
        <h3 className="text-sm font-medium text-foreground mb-3">{config.title}</h3>
      )}
      {renderChart()}
    </motion.div>
  );
}
