"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
import { motion } from "framer-motion";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

// Bella Casa HQ — Firenze
const HQ: [number, number] = [11.2558, 43.7696];

interface SupplierPoint {
  name: string;
  coordinates: [number, number];
  status: "on-time" | "delayed" | "critical";
  category: string;
  onTimePct?: number;
}

interface SupplyChainMapProps {
  data?: Record<string, unknown>[];
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  "on-time": "#16a34a",
  delayed: "#d97706",
  critical: "#dc2626",
};

const DEFAULT_SUPPLIERS: SupplierPoint[] = [
  { name: "Legnami Toscani", coordinates: [11.78, 43.32], status: "on-time", category: "Wood", onTimePct: 94 },
  { name: "Pelle di Firenze", coordinates: [11.25, 43.77], status: "on-time", category: "Leather", onTimePct: 91 },
  { name: "Tessuti Milano", coordinates: [9.19, 45.46], status: "critical", category: "Fabric", onTimePct: 65 },
  { name: "Schiuma Veneta", coordinates: [12.33, 45.44], status: "critical", category: "Foam", onTimePct: 65 },
  { name: "Ferramenta Bologna", coordinates: [11.34, 44.49], status: "on-time", category: "Hardware", onTimePct: 91 },
  { name: "Vetro Murano", coordinates: [12.35, 45.46], status: "delayed", category: "Glass", onTimePct: 88 },
  { name: "Colori Napoli", coordinates: [14.27, 40.85], status: "on-time", category: "Paint", onTimePct: 92 },
  { name: "Imballaggi Roma", coordinates: [12.50, 41.90], status: "on-time", category: "Packaging", onTimePct: 95 },
];

export function SupplyChainMap({ data, height = 400 }: SupplyChainMapProps) {
  const suppliers = useMemo(() => {
    if (!data || data.length === 0) return DEFAULT_SUPPLIERS;
    return data.map((d) => ({
      name: String(d.name || d.supplier || ""),
      coordinates: [Number(d.lng || d.lon || 12), Number(d.lat || 43)] as [number, number],
      status: (String(d.status || "on-time")) as SupplierPoint["status"],
      category: String(d.category || ""),
      onTimePct: Number(d.on_time_pct || d.onTimePct || 0),
    }));
  }, [data]);

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-lg bg-[#0a0f1a]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [12, 43], scale: 2800 }}
        width={600}
        height={height}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rpiid}
                geography={geo}
                fill="#1a2332"
                stroke="#2a3a4f"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none", fill: "#1e293b" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Supply route lines */}
        {suppliers.map((s, i) => (
          <Line
            key={`line-${i}`}
            from={s.coordinates}
            to={HQ}
            stroke={STATUS_COLORS[s.status]}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeOpacity={0.4}
            strokeDasharray="4 3"
          />
        ))}

        {/* HQ marker */}
        <Marker coordinates={HQ}>
          <circle r={6} fill="#ffffff" stroke="#0a0f1a" strokeWidth={2} />
          <circle r={3} fill="#3b82f6" />
          <text
            textAnchor="middle"
            y={-12}
            style={{ fontFamily: "system-ui", fill: "#94a3b8", fontSize: "8px", fontWeight: 600 }}
          >
            Bella Casa HQ
          </text>
        </Marker>

        {/* Supplier markers */}
        {suppliers.map((s, i) => (
          <Marker key={`marker-${i}`} coordinates={s.coordinates}>
            <circle r={5} fill={STATUS_COLORS[s.status]} stroke="#0a0f1a" strokeWidth={1.5} />
            {/* Pulse ring for critical */}
            {s.status === "critical" && (
              <circle r={5} fill="none" stroke={STATUS_COLORS[s.status]} strokeWidth={1}>
                <animate
                  attributeName="r"
                  from="5"
                  to="14"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <text
              textAnchor="start"
              x={8}
              y={3}
              style={{ fontFamily: "system-ui", fill: "#e2e8f0", fontSize: "7px" }}
            >
              {s.name}
            </text>
            {s.onTimePct !== undefined && (
              <text
                textAnchor="start"
                x={8}
                y={12}
                style={{
                  fontFamily: "monospace",
                  fill: STATUS_COLORS[s.status],
                  fontSize: "6.5px",
                  fontWeight: 600,
                }}
              >
                {s.onTimePct}% on-time
              </text>
            )}
          </Marker>
        ))}
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3">
        {[
          { label: "On-time", color: "#16a34a" },
          { label: "Delayed", color: "#d97706" },
          { label: "Critical", color: "#dc2626" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Title overlay */}
      <div className="absolute top-3 left-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          Live Supply Chain
        </span>
      </div>
    </div>
  );
}
