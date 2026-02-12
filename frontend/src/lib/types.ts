// Chart configuration for rendering dynamic charts
export interface ChartConfig {
  type: "bar" | "line" | "area" | "pie" | "metric";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

// Table schema from the data warehouse
export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
  rowCount: number;
  description?: string;
}

// Dashboard types
export interface Dashboard {
  id: string;
  title: string;
  description: string;
  charts: ChartConfig[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDashboardData {
  title: string;
  description: string;
  charts: ChartConfig[];
}

export interface UpdateDashboardData {
  title?: string;
  description?: string;
  charts?: ChartConfig[];
  pinned?: boolean;
}

// Focus monitoring items
export type FocusStatus = "alert" | "warning" | "ok" | "inactive";
export type TrendDirection = "up" | "down" | "flat";

export interface FocusItem {
  id: string;
  metricName: string;
  currentValue: number;
  previousValue: number;
  threshold: {
    warning: number;
    alert: number;
  };
  status: FocusStatus;
  trend: TrendDirection;
  trendPercent: number;
  sparklineData: number[];
  unit: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFocusItemData {
  metricName: string;
  threshold: {
    warning: number;
    alert: number;
  };
  unit: string;
  description?: string;
}

export interface UpdateFocusItemData {
  metricName?: string;
  threshold?: {
    warning: number;
    alert: number;
  };
  unit?: string;
  description?: string;
}

// Company profile
export interface CompanyProfile {
  name: string;
  industry: string;
  description: string;
  currency: string;
  fiscalYearStart: string;
  tables: string[];
  dataLoaded: boolean;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
  timestamp: Date;
}

// Thought stream types
export type ThoughtEventType =
  | "thinking"
  | "executing_sql"
  | "found_insight"
  | "generating_chart"
  | "error";

export interface ThoughtEvent {
  type: ThoughtEventType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// API response wrapper
export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Metric summary for hub
export interface MetricSummary {
  label: string;
  value: number;
  previousValue: number;
  format: "currency" | "number" | "percent";
  trend: TrendDirection;
  trendPercent: number;
  sparklineData: number[];
  unit?: string;
}

// Active dashboard context for stateful agent
export interface DashboardContext {
  id: string;
  title: string;
  charts: ChartConfig[];
}

// Chat context sent to backend
export interface ChatContext {
  page: string;
  dashboard?: DashboardContext;
}

// Insight from Alex
export interface InsightItem {
  id: string;
  content: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
  relatedMetric?: string;
}
