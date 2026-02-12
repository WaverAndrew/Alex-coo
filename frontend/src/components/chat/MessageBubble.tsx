"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Markdown } from "@/components/chat/Markdown";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono bg-background/80 border border-border/50">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-foreground mt-3 mb-1">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-sm text-foreground/90 ml-4 list-disc">
          {renderInlineFormatting(line.slice(2))}
        </li>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="text-sm text-foreground/90 ml-4 list-decimal">
          {renderInlineFormatting(text)}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-foreground/90 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="code-end" className="rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono bg-background/80 border border-border/50">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <>{elements}</>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch: { index: number; length: number; type: "bold" | "code"; content: string } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        type: "bold",
        content: boldMatch[1],
      };
    }

    if (
      codeMatch &&
      codeMatch.index !== undefined &&
      (!firstMatch || codeMatch.index < firstMatch.index)
    ) {
      firstMatch = {
        index: codeMatch.index,
        length: codeMatch[0].length,
        type: "code",
        content: codeMatch[1],
      };
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    if (firstMatch.type === "bold") {
      parts.push(
        <strong key={keyIdx++} className="font-semibold text-foreground">
          {firstMatch.content}
        </strong>
      );
    } else {
      parts.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
        >
          {firstMatch.content}
        </code>
      );
    }

    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }

  return <>{parts}</>;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={cn("flex gap-3 max-w-full", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-background" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3",
          isUser
            ? "bg-foreground text-background"
            : "bg-muted/50"
        )}
      >
        {isUser ? (
          <p className="text-sm text-foreground">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}

        {message.charts && message.charts.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.charts.map((chart, idx) => (
              <ChartRenderer key={idx} config={chart} height={220} />
            ))}
          </div>
        )}

        <p
          className={cn(
            "text-[10px] mt-2",
            isUser ? "text-muted-foreground text-right" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
