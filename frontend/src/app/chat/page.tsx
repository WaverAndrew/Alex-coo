"use client";

import { useEffect, useRef, useCallback, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ThinkingPanel } from "@/components/interpretability/ThinkingPanel";
import { useChatStore, useThoughtStore, useDashboardStore } from "@/lib/store";
import { sendChatMessage, connectThoughtStream } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChartConfig } from "@/lib/types";

function ChatContent() {
  const searchParams = useSearchParams();
  const {
    messages, addMessage, isLoading, setLoading, sessionId,
    history, loadConversation, deleteConversation, startNewConversation,
  } = useChatStore();
  const { clearThoughts, setProcessing } = useThoughtStore();
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const abortRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [editValue, setEditValue] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const disconnect = connectThoughtStream();
    return disconnect;
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (mounted) {
      const q = searchParams.get("q");
      if (q && !initialSent.current) {
        initialSent.current = true;
        startNewConversation();
        clearThoughts();
        setTimeout(() => handleSend(q), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setLoading(false);
    setProcessing(false);
  }, [setLoading, setProcessing]);

  const handleEdit = useCallback((content: string) => {
    setEditValue(content);
  }, []);

  const handleSend = useCallback(
    async (message: string) => {
      if (isLoading) return;
      abortRef.current = false;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      addMessage(userMessage);
      setLoading(true);
      clearThoughts();
      setProcessing(true);

      try {
        const response = await sendChatMessage(message, sessionId);

        if (abortRef.current) return; // stopped

        const charts: ChartConfig[] | undefined =
          response.charts && response.charts.length > 0 ? response.charts : undefined;

        if (response.intent === "dashboard" && charts && charts.length > 0) {
          const title = message.replace(/^(create|build|make)\s+(a\s+)?dashboard\s*(of|for|about)?\s*/i, "").trim() || "Dashboard";
          createDashboard(title.charAt(0).toUpperCase() + title.slice(1), response.reply || "", charts);
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply || "",
          charts,
          timestamp: new Date(),
        };

        if (!abortRef.current) addMessage(assistantMessage);
      } catch {
        if (!abortRef.current) {
          addMessage({
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I hit a snag processing that. Could you rephrase?",
            timestamp: new Date(),
          });
        }
      } finally {
        if (!abortRef.current) {
          setLoading(false);
          setProcessing(false);
        }
      }
    },
    [isLoading, sessionId, addMessage, setLoading, clearThoughts, setProcessing, createDashboard]
  );

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* History sidebar */}
      <div className="w-56 border-r border-border bg-muted/20 flex-col shrink-0 hidden md:flex">
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">History</span>
          <button
            onClick={() => { startNewConversation(); clearThoughts(); }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="New conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {messages.length > 0 && (
            <div className="px-2 mb-1">
              <div className="px-2 py-2 rounded-lg bg-muted text-xs font-medium text-foreground truncate">
                {messages.find((m) => m.role === "user")?.content.slice(0, 40) || "Current"}
              </div>
            </div>
          )}

          {history
            .filter((c) => c.id !== sessionId)
            .map((convo) => (
              <div key={convo.id} className="px-2 mb-0.5 group flex items-start">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { loadConversation(convo.id); clearThoughts(); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { loadConversation(convo.id); clearThoughts(); } }}
                  className="flex-1 min-w-0 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-2"
                >
                  <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 truncate">{convo.title}</p>
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(convo.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteConversation(convo.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 mt-2 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

          {history.filter((c) => c.id !== sessionId).length === 0 && messages.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] text-muted-foreground/60">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-background">A</span>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Hey, I&apos;m Alex
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your COO agent for Bella Casa Furniture. Ask me anything about
                  revenue, margins, customers, production, or operations.
                </p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === "user" ? handleEdit : undefined}
                />
              ))}
              {isLoading && <TypingIndicator />}
            </AnimatePresence>
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            isLoading={isLoading}
            editValue={editValue}
            onEditClear={() => setEditValue(null)}
          />
        </div>

        {/* Thinking Panel */}
        <div className="hidden lg:block w-80 xl:w-96 border-l border-border p-3">
          <ThinkingPanel />
        </div>
      </div>
      <AgentStatusBar />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
