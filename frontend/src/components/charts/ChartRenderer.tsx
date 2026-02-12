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

const DEFAULT_COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  color: "#0f172a",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
};

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

  const commonAxisProps = {
    stroke: "#94a3b8",
    fontSize: 11,
    tickLine: false,
    axisLine: { stroke: "#e2e8f0" },
  };

  const gridProps = {
    strokeDasharray: "3 3",
    stroke: "#f1f5f9",
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
              <YAxis {...commonAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(0, 0, 0, 0.03)" }} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
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
              <YAxis {...commonAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
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
              <YAxis {...commonAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
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
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
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
