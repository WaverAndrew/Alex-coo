"use client";

import { useThoughtStore } from "./store";
import { useChatStore } from "./store";
import type { ThoughtEvent, ThoughtEventType, ChartConfig, ChatContext } from "./types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

let thoughtSocket: WebSocket | null = null;
let chatSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY = 5000;

// ---------- Thought Stream ----------

export function connectThoughtStream(): () => void {
  if (typeof window === "undefined") return () => {};
  if (thoughtSocket?.readyState === WebSocket.OPEN) {
    return () => disconnectThoughtStream();
  }

  const url = `${WS_BASE}/ws/thoughts`;

  try {
    thoughtSocket = new WebSocket(url);

    thoughtSocket.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    thoughtSocket.onmessage = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data);
        const thought: ThoughtEvent = {
          type: raw.type as ThoughtEventType,
          content: raw.content || "",
          metadata: raw.metadata || undefined,
          timestamp: new Date(raw.timestamp || Date.now()),
        };

        const store = useThoughtStore.getState();
        store.addThought(thought);

        if (thought.type === "thinking" || thought.type === "executing_sql") {
          store.setProcessing(true);
        }
        if (
          thought.type === "found_insight" ||
          thought.type === "generating_chart" ||
          thought.type === "error"
        ) {
          store.setProcessing(false);
        }
      } catch {
        // Silently ignore unparseable messages
      }
    };

    thoughtSocket.onclose = () => {
      thoughtSocket = null;
      // Quietly reconnect after a delay
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectThoughtStream();
        }, RECONNECT_DELAY);
      }
    };

    thoughtSocket.onerror = () => {
      // WebSocket errors are expected when backend is restarting.
      // The onclose handler will fire next and handle reconnection.
      thoughtSocket?.close();
    };
  } catch {
    // Connection failed — retry later
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectThoughtStream();
      }, RECONNECT_DELAY);
    }
  }

  return () => disconnectThoughtStream();
}

export function disconnectThoughtStream(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (thoughtSocket) {
    thoughtSocket.close();
    thoughtSocket = null;
  }
}

// ---------- Chat via WebSocket ----------

interface WSChatResponse {
  reply: string;
  charts?: ChartConfig[];
  dashboard_update?: {
    action: "replace_all" | "add" | "remove" | "replace";
    charts?: ChartConfig[];
    index?: number;
  };
  intent?: string;
  session_id: string;
}

export function sendChatMessage(
  message: string,
  sessionId: string,
  context?: ChatContext
): Promise<WSChatResponse> {
  return new Promise((resolve, reject) => {
    const url = `${WS_BASE}/ws/chat`;

    try {
      chatSocket = new WebSocket(url);

      chatSocket.onopen = () => {
        chatSocket?.send(
          JSON.stringify({
            message,
            session_id: sessionId,
            context: context || undefined,
          })
        );
      };

      let responseData: WSChatResponse | null = null;

      chatSocket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "thought") {
            const thought: ThoughtEvent = {
              type: data.thought_type as ThoughtEventType,
              content: data.content || "",
              metadata: data.metadata || undefined,
              timestamp: new Date(),
            };
            useThoughtStore.getState().addThought(thought);

            if (
              thought.type === "thinking" ||
              thought.type === "executing_sql"
            ) {
              useThoughtStore.getState().setProcessing(true);
            }
          }

          if (data.type === "response") {
            responseData = {
              reply: data.reply,
              charts: data.charts || [],
              session_id: data.session_id || sessionId,
            };
            useThoughtStore.getState().setProcessing(false);
            useChatStore.getState().setLoading(false);
          }

          if (data.type === "done" || data.type === "response") {
            chatSocket?.close();
            if (responseData) {
              resolve(responseData);
            }
          }

          if (data.type === "error") {
            useThoughtStore.getState().setProcessing(false);
            useChatStore.getState().setLoading(false);
            reject(new Error(data.content || "Chat error"));
            chatSocket?.close();
          }
        } catch {
          // Ignore parse errors
        }
      };

      chatSocket.onerror = () => {
        useThoughtStore.getState().setProcessing(false);
        useChatStore.getState().setLoading(false);
        reject(new Error("Could not connect to Alex. Is the backend running?"));
      };

      chatSocket.onclose = () => {
        if (responseData) {
          resolve(responseData);
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}
