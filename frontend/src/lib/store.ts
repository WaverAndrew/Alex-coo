"use client";

import { create } from "zustand";
import type {
  ChatMessage,
  ThoughtEvent,
  Dashboard,
  FocusItem,
  CompanyProfile,
  ChartConfig,
  DashboardContext,
} from "./types";
import {
  getDashboards as fetchDashboardsAPI,
  getFocusItems as fetchFocusItemsAPI,
  getCompanyProfile as fetchCompanyProfileAPI,
} from "./api";

// ---------- Chat History ----------

interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

function loadHistory(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("chat-history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((c: Record<string, unknown>) => ({
      ...c,
      messages: ((c.messages as Record<string, unknown>[]) || []).map((m: Record<string, unknown>) => ({
        ...m,
        timestamp: new Date(m.timestamp as string),
      })),
    }));
  } catch { return []; }
}

function saveHistory(convos: SavedConversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("chat-history", JSON.stringify(convos.slice(0, 30)));
}

function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find((m) => m.role === "user");
  if (!first) return "New conversation";
  return first.content.slice(0, 50) + (first.content.length > 50 ? "..." : "");
}

// ---------- Chat Store ----------

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  // History
  history: SavedConversation[];
  loadConversation: (id: string) => void;
  saveCurrentToHistory: () => void;
  deleteConversation: (id: string) => void;
  startNewConversation: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
    // Auto-save after each assistant message
    if (message.role === "assistant") {
      setTimeout(() => get().saveCurrentToHistory(), 100);
    }
  },
  clearMessages: () => set({ messages: [] }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  sessionId: generateId(),
  setSessionId: (id) => set({ sessionId: id }),

  history: typeof window !== "undefined" ? loadHistory() : [],

  saveCurrentToHistory: () => {
    const { messages, sessionId, history } = get();
    if (messages.length === 0) return;
    const existing = history.findIndex((c) => c.id === sessionId);
    const convo: SavedConversation = {
      id: sessionId,
      title: titleFromMessages(messages),
      messages,
      updatedAt: new Date().toISOString(),
    };
    let updated: SavedConversation[];
    if (existing >= 0) {
      updated = [...history];
      updated[existing] = convo;
    } else {
      updated = [convo, ...history];
    }
    updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    saveHistory(updated);
    set({ history: updated });
  },

  loadConversation: (id) => {
    const { history, saveCurrentToHistory, messages } = get();
    // Save current first if it has messages
    if (messages.length > 0) saveCurrentToHistory();
    const convo = history.find((c) => c.id === id);
    if (convo) {
      set({ messages: convo.messages, sessionId: convo.id });
    }
  },

  deleteConversation: (id) => {
    const { history } = get();
    const updated = history.filter((c) => c.id !== id);
    saveHistory(updated);
    set({ history: updated });
  },

  startNewConversation: () => {
    const { saveCurrentToHistory, messages } = get();
    if (messages.length > 0) saveCurrentToHistory();
    set({ messages: [], sessionId: generateId() });
  },
}));

// ---------- Thought Store ----------

interface ThoughtStore {
  thoughts: ThoughtEvent[];
  addThought: (thought: ThoughtEvent) => void;
  clearThoughts: () => void;
  isProcessing: boolean;
  setProcessing: (processing: boolean) => void;
}

export const useThoughtStore = create<ThoughtStore>((set) => ({
  thoughts: [],
  addThought: (thought) =>
    set((state) => ({ thoughts: [...state.thoughts, thought] })),
  clearThoughts: () => set({ thoughts: [] }),
  isProcessing: false,
  setProcessing: (processing) => set({ isProcessing: processing }),
}));

// ---------- Dashboard Store ----------

interface DashboardStore {
  dashboards: Dashboard[];
  pinnedDashboards: Dashboard[];
  isLoading: boolean;
  error: string | null;
  fetchDashboards: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  dashboards: [],
  pinnedDashboards: [],
  isLoading: false,
  error: null,
  fetchDashboards: async () => {
    set({ isLoading: true, error: null });
    try {
      const dashboards = await fetchDashboardsAPI();
      const pinned = dashboards.filter((d) => d.pinned);
      set({ dashboards, pinnedDashboards: pinned, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch dashboards",
        isLoading: false,
      });
    }
  },
}));

// ---------- Focus Store ----------

interface FocusStore {
  items: FocusItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
}

export const useFocusStore = create<FocusStore>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await fetchFocusItemsAPI();
      set({ items, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch focus items",
        isLoading: false,
      });
    }
  },
}));

// ---------- Active Dashboard Store ----------
// Tracks which dashboard the user is viewing for context-aware agent interaction

interface ActiveDashboardStore {
  dashboard: DashboardContext | null;
  setDashboard: (dashboard: DashboardContext | null) => void;
  updateCharts: (charts: ChartConfig[]) => void;
  addChart: (chart: ChartConfig) => void;
  removeChart: (index: number) => void;
  replaceChart: (index: number, chart: ChartConfig) => void;
}

function persistDashboard(dashboard: DashboardContext | null) {
  if (typeof window === "undefined") return;
  if (dashboard) {
    localStorage.setItem(`dashboard-${dashboard.id}`, JSON.stringify(dashboard.charts));
  }
}

function loadPersistedCharts(id: string): ChartConfig[] | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(`dashboard-${id}`);
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}

export const useActiveDashboardStore = create<ActiveDashboardStore>((set) => ({
  dashboard: null,
  setDashboard: (dashboard) => {
    if (dashboard) {
      const saved = loadPersistedCharts(dashboard.id);
      if (saved && saved.length > 0) {
        dashboard = { ...dashboard, charts: saved };
      }
    }
    set({ dashboard });
  },
  updateCharts: (charts) =>
    set((state) => {
      if (!state.dashboard) return state;
      const updated = { ...state.dashboard, charts };
      persistDashboard(updated);
      return { dashboard: updated };
    }),
  addChart: (chart) =>
    set((state) => {
      if (!state.dashboard) return state;
      const updated = { ...state.dashboard, charts: [...state.dashboard.charts, chart] };
      persistDashboard(updated);
      return { dashboard: updated };
    }),
  removeChart: (index) =>
    set((state) => {
      if (!state.dashboard) return state;
      const updated = { ...state.dashboard, charts: state.dashboard.charts.filter((_, i) => i !== index) };
      persistDashboard(updated);
      return { dashboard: updated };
    }),
  replaceChart: (index, chart) =>
    set((state) => {
      if (!state.dashboard) return state;
      const charts = [...state.dashboard.charts];
      charts[index] = chart;
      const updated = { ...state.dashboard, charts };
      persistDashboard(updated);
      return { dashboard: updated };
    }),
}));

// ---------- App Store ----------

type PageName = "hub" | "chat" | "focus" | "dashboard" | "onboarding";

interface AppStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  currentPage: PageName;
  setCurrentPage: (page: PageName) => void;
  companyProfile: CompanyProfile | null;
  isLoadingProfile: boolean;
  fetchCompanyProfile: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  currentPage: "hub",
  setCurrentPage: (page) => set({ currentPage: page }),
  companyProfile: null,
  isLoadingProfile: false,
  fetchCompanyProfile: async () => {
    set({ isLoadingProfile: true });
    try {
      const profile = await fetchCompanyProfileAPI();
      set({ companyProfile: profile, isLoadingProfile: false });
    } catch {
      set({ isLoadingProfile: false });
    }
  },
}));
