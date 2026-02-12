"use client";

import { useEffect, useRef, useCallback, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { AgentStatusBar } from "@/components/layout/AgentStatusBar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ThinkingPanel } from "@/components/interpretability/ThinkingPanel";
import { useChatStore, useThoughtStore } from "@/lib/store";
import { sendChatMessage, connectThoughtStream } from "@/lib/websocket";
import type { ChatMessage } from "@/lib/types";

function ChatContent() {
  const searchParams = useSearchParams();
  const { messages, addMessage, isLoading, setLoading, sessionId } = useChatStore();
  const { clearThoughts, setProcessing } = useThoughtStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);
  const [mounted, setMounted] = useState(false);

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
      if (q && !initialSent.current && messages.length === 0) {
        initialSent.current = true;
        handleSend(q);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleSend = useCallback(
    async (message: string) => {
      if (isLoading) return;

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

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply || "",
          charts: response.charts,
          timestamp: new Date(),
        };

        addMessage(assistantMessage);
      } catch {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I hit a snag processing that. Let me try a different approach - could you rephrase your question?",
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      } finally {
        setLoading(false);
        setProcessing(false);
      }
    },
    [isLoading, sessionId, addMessage, setLoading, clearThoughts, setProcessing]
  );

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col lg:w-2/3">
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
                  revenue, margins, customers, production, or operations. I&apos;ll
                  show you charts and explain my reasoning.
                </p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </AnimatePresence>
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} isLoading={isLoading} />
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
