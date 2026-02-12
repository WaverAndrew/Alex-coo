"use client";

import React from "react";

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: { index: number; length: number; type: "bold" | "code"; content: string } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0].length, type: "bold", content: boldMatch[1] };
    }
    if (codeMatch && codeMatch.index !== undefined && (!firstMatch || codeMatch.index < firstMatch.index)) {
      firstMatch = { index: codeMatch.index, length: codeMatch[0].length, type: "code", content: codeMatch[1] };
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) parts.push(remaining.slice(0, firstMatch.index));

    if (firstMatch.type === "bold") {
      parts.push(<strong key={keyIdx++} className="font-semibold text-foreground">{firstMatch.content}</strong>);
    } else {
      parts.push(<code key={keyIdx++} className="px-1 py-0.5 rounded bg-muted text-foreground text-xs font-mono">{firstMatch.content}</code>);
    }
    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }
  return <>{parts}</>;
}

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono bg-muted border border-border">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{renderInlineFormatting(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{renderInlineFormatting(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold text-foreground mt-3 mb-1">{renderInlineFormatting(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={i} className="text-sm text-foreground/90 ml-4 list-disc">{renderInlineFormatting(line.slice(2))}</li>);
    } else if (line.match(/^\d+\.\s/)) {
      elements.push(<li key={i} className="text-sm text-foreground/90 ml-4 list-decimal">{renderInlineFormatting(line.replace(/^\d+\.\s/, ""))}</li>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<p key={i} className="text-sm text-foreground/90 leading-relaxed">{renderInlineFormatting(line)}</p>);
    }
  }

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="code-end" className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono bg-muted border border-border">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}
