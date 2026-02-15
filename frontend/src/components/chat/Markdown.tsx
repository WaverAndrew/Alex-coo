"use client";

import React from "react";
import { AlertTriangle, Lightbulb, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Inline formatting: bold -> highlighted metric pills, code -> mono spans
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let k = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let first: { idx: number; len: number; type: "bold" | "code"; content: string } | null = null;

    if (boldMatch?.index !== undefined) {
      first = { idx: boldMatch.index, len: boldMatch[0].length, type: "bold", content: boldMatch[1] };
    }
    if (codeMatch?.index !== undefined && (!first || codeMatch.index < first.idx)) {
      first = { idx: codeMatch.index, len: codeMatch[0].length, type: "code", content: codeMatch[1] };
    }

    if (!first) { parts.push(remaining); break; }
    if (first.idx > 0) parts.push(remaining.slice(0, first.idx));

    if (first.type === "bold") {
      // Check if it's a metric (EUR, %, number with units)
      const isMetric = /^(EUR|USD|\$|€|£)?\s?[\d,.]+[MKBmkb%]?/.test(first.content) ||
                       /\d+(\.\d+)?%/.test(first.content) ||
                       /^\d[\d,.]*\s*(EUR|USD|days|orders|customers|units)/i.test(first.content);

      if (isMetric) {
        parts.push(
          <span key={k++} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/5 border border-border font-mono text-[13px] font-semibold text-foreground">
            {first.content}
          </span>
        );
      } else {
        parts.push(<strong key={k++} className="font-semibold text-foreground">{first.content}</strong>);
      }
    } else {
      parts.push(<code key={k++} className="px-1 py-0.5 rounded bg-muted text-foreground text-xs font-mono">{first.content}</code>);
    }
    remaining = remaining.slice(first.idx + first.len);
  }
  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Detect special line types
// ---------------------------------------------------------------------------

type BlockType =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "numbered"; text: string }
  | { kind: "empty" }
  | { kind: "code"; lines: string[] }
  | { kind: "callout"; variant: "warning" | "insight" | "action" | "positive"; text: string };

function classifyLine(line: string): { kind: string; hint?: string } {
  const lower = line.toLowerCase();
  // Warning/risk patterns
  if (/\b(warning|risk|concern|trouble|critical|unreliable|flagged|dropped|decline|lost|gap)\b/i.test(lower) &&
      /\b(should|need|must|watch|attention|careful|remember|issue)\b/i.test(lower)) {
    return { kind: "warning" };
  }
  // Action/recommendation patterns
  if (/^(we should|i('d| would) (recommend|suggest)|action|recommended|let's|consider|next step)/i.test(lower.trim())) {
    return { kind: "action" };
  }
  // Positive patterns
  if (/\b(strong|healthy|growing|impressive|solid|good news|up \d+%|positive|momentum)\b/i.test(lower) &&
      !/\b(not|isn't|wasn't|no longer)\b/i.test(lower)) {
    return { kind: "positive" };
  }
  // Bottom line / key insight
  if (/^(bottom line|key (insight|takeaway|finding)|in summary|the big picture|what this means)/i.test(lower.trim())) {
    return { kind: "insight" };
  }
  return { kind: "normal" };
}

function parseBlocks(content: string): BlockType[] {
  const lines = content.split("\n");
  const blocks: BlockType[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ kind: "code", lines: codeLines });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) {
      blocks.push({ kind: "heading", level: 3, text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", level: 2, text: line.slice(3) });
    } else if (line.startsWith("# ")) {
      blocks.push({ kind: "heading", level: 1, text: line.slice(2) });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ kind: "bullet", text: line.slice(2) });
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push({ kind: "numbered", text: line.replace(/^\d+\.\s/, "") });
    } else if (line.trim() === "") {
      blocks.push({ kind: "empty" });
    } else {
      // Check for special callout patterns
      const cls = classifyLine(line);
      if (cls.kind === "warning") {
        blocks.push({ kind: "callout", variant: "warning", text: line });
      } else if (cls.kind === "action") {
        blocks.push({ kind: "callout", variant: "action", text: line });
      } else if (cls.kind === "insight") {
        blocks.push({ kind: "callout", variant: "insight", text: line });
      } else if (cls.kind === "positive") {
        blocks.push({ kind: "callout", variant: "positive", text: line });
      } else {
        blocks.push({ kind: "paragraph", text: line });
      }
    }
  }

  if (inCode && codeLines.length > 0) {
    blocks.push({ kind: "code", lines: codeLines });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Render blocks
// ---------------------------------------------------------------------------

const CALLOUT_STYLES = {
  warning: { bg: "bg-warning/5", border: "border-warning/20", icon: AlertTriangle, iconColor: "text-warning" },
  insight: { bg: "bg-primary/5", border: "border-primary/20", icon: Lightbulb, iconColor: "text-primary" },
  action: { bg: "bg-chart-5/5", border: "border-chart-5/20", icon: ArrowRight, iconColor: "text-chart-5" },
  positive: { bg: "bg-success/5", border: "border-success/20", icon: TrendingUp, iconColor: "text-success" },
};

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-1 ${className}`}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading": {
            const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
            const size = block.level === 1 ? "text-base font-bold" : block.level === 2 ? "text-sm font-bold" : "text-sm font-semibold";
            return <Tag key={i} className={`${size} text-foreground mt-3 mb-1`}>{renderInline(block.text)}</Tag>;
          }
          case "paragraph":
            return <p key={i} className="text-sm text-foreground/85 leading-relaxed">{renderInline(block.text)}</p>;
          case "bullet":
            return <li key={i} className="text-sm text-foreground/85 ml-4 list-disc leading-relaxed">{renderInline(block.text)}</li>;
          case "numbered":
            return <li key={i} className="text-sm text-foreground/85 ml-4 list-decimal leading-relaxed">{renderInline(block.text)}</li>;
          case "empty":
            return <div key={i} className="h-1" />;
          case "code":
            return (
              <pre key={i} className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono bg-muted border border-border">
                <code>{block.lines.join("\n")}</code>
              </pre>
            );
          case "callout": {
            const style = CALLOUT_STYLES[block.variant];
            const Icon = style.icon;
            return (
              <div key={i} className={`flex gap-2.5 px-3 py-2.5 rounded-lg border ${style.bg} ${style.border} my-1.5`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                <p className="text-sm text-foreground/90 leading-relaxed">{renderInline(block.text)}</p>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
