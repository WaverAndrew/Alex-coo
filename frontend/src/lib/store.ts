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

// ---------- Chat Store ----------

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  sessionId: generateId(),
  setSessionId: (id) => set({ sessionId: id }),
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

export const useActiveDashboardStore = create<ActiveDashboardStore>((set) => ({
  dashboard: null,
  setDashboard: (dashboard) => set({ dashboard }),
  updateCharts: (charts) =>
    set((state) => {
      if (!state.dashboard) return state;
      return { dashboard: { ...state.dashboard, charts } };
    }),
  addChart: (chart) =>
    set((state) => {
      if (!state.dashboard) return state;
      return { dashboard: { ...state.dashboard, charts: [...state.dashboard.charts, chart] } };
    }),
  removeChart: (index) =>
    set((state) => {
      if (!state.dashboard) return state;
      return { dashboard: { ...state.dashboard, charts: state.dashboard.charts.filter((_, i) => i !== index) } };
    }),
  replaceChart: (index, chart) =>
    set((state) => {
      if (!state.dashboard) return state;
      const charts = [...state.dashboard.charts];
      charts[index] = chart;
      return { dashboard: { ...state.dashboard, charts } };
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
