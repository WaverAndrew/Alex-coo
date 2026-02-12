import type {
  TableSchema,
  Dashboard,
  CreateDashboardData,
  UpdateDashboardData,
  FocusItem,
  CreateFocusItemData,
  UpdateFocusItemData,
  CompanyProfile,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class APIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new APIError(errorMessage, response.status);
  }

  const data = await response.json();
  return data as T;
}

// ---------- Tables / Schema ----------

export async function getTables(): Promise<string[]> {
  return fetchAPI<string[]>("/api/data/tables");
}

export async function getTableSchema(
  name: string
): Promise<TableSchema> {
  return fetchAPI<TableSchema>(`/api/data/tables/${encodeURIComponent(name)}`);
}

// ---------- Chat ----------

export interface SendMessageResponse {
  content: string;
  session_id: string;
  chart_configs: Array<{
    type: string;
    title: string;
    data: Record<string, unknown>[];
    xKey: string;
    yKeys: string[];
    colors?: string[];
  }>;
  confidence?: string;
  intent?: string;
}

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<SendMessageResponse> {
  return fetchAPI<SendMessageResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

// ---------- Dashboards ----------

export async function getDashboards(): Promise<Dashboard[]> {
  return fetchAPI<Dashboard[]>("/api/dashboards");
}

export async function getDashboard(id: string): Promise<Dashboard> {
  return fetchAPI<Dashboard>(`/api/dashboards/${encodeURIComponent(id)}`);
}

export async function createDashboard(
  data: CreateDashboardData
): Promise<Dashboard> {
  return fetchAPI<Dashboard>("/api/dashboards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDashboard(
  id: string,
  data: UpdateDashboardData
): Promise<Dashboard> {
  return fetchAPI<Dashboard>(
    `/api/dashboards/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteDashboard(id: string): Promise<void> {
  await fetchAPI<void>(
    `/api/dashboards/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function togglePinDashboard(
  id: string
): Promise<Dashboard> {
  return fetchAPI<Dashboard>(
    `/api/dashboards/${encodeURIComponent(id)}/pin`,
    { method: "POST" }
  );
}

// ---------- Focus ----------

export async function getFocusItems(): Promise<FocusItem[]> {
  return fetchAPI<FocusItem[]>("/api/focus");
}

export async function createFocusItem(
  data: CreateFocusItemData
): Promise<FocusItem> {
  return fetchAPI<FocusItem>("/api/focus", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFocusItem(
  id: string,
  data: UpdateFocusItemData
): Promise<FocusItem> {
  return fetchAPI<FocusItem>(
    `/api/focus/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteFocusItem(id: string): Promise<void> {
  await fetchAPI<void>(
    `/api/focus/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

// ---------- Company Profile ----------

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return fetchAPI<CompanyProfile>("/api/company");
}

// ---------- Demo Data ----------

export async function loadDemoData(): Promise<{ success: boolean; message: string }> {
  return fetchAPI<{ success: boolean; message: string }>("/api/company/demo", {
    method: "POST",
  });
}
