/**
 * Service layer. Tries real API first; on ApiUnavailableError, falls back to mock data
 * so the UI stays functional during development and demos.
 */
import { api, ApiUnavailableError, getAuthToken } from "./api";
import { getConfig } from "./config";
import {
  mockAlerts, mockAudit, mockCurrentModel, mockHealth, mockLogs,
  mockModelHistory, mockProtocolDistribution, mockStats, mockTrend,
  setMockMonitoring,
} from "./mock";
import type {
  AlertItem, AuditEntry, LogItem, ModelInfo,
  ProtocolDistributionItem, Stats, SystemHealth, TrendPoint,
} from "./types";

async function withFallback<T>(real: () => Promise<T>, fallback: () => T, tag: string): Promise<{ data: T; degraded: boolean; reason?: string }> {
  try {
    const data = await real();
    return { data, degraded: false };
  } catch (err) {
    if (err instanceof ApiUnavailableError) {
      return { data: fallback(), degraded: true, reason: `${tag}: backend unavailable` };
    }
    throw err;
  }
}

export const sentinel = {
  health: () => withFallback(() => api.get<{ status: string }>("/api/health"), () => ({ status: "ok" }), "health"),
  stats: () => withFallback(() => api.get<Stats>("/api/stats"), mockStats, "stats"),
  alerts: (limit: number) => withFallback(() => api.get<AlertItem[]>("/api/alerts", { limit }), () => mockAlerts(limit), "alerts"),
  logs: (limit: number) => withFallback(() => api.get<LogItem[]>("/api/logs", { limit }), () => mockLogs(limit), "logs"),
  protocolDistribution: (limit: number) =>
    withFallback(() => api.get<ProtocolDistributionItem[]>("/api/protocol-distribution", { limit }), mockProtocolDistribution, "protocols"),
  trend: () => withFallback(async () => mockTrend(), () => mockTrend(), "trend"),

  startMonitoring: async () => {
    try { await api.post("/api/monitoring/start"); }
    catch (err) { if (!(err instanceof ApiUnavailableError)) throw err; }
    setMockMonitoring(true);
  },
  stopMonitoring: async () => {
    try { await api.post("/api/monitoring/stop"); }
    catch (err) { if (!(err instanceof ApiUnavailableError)) throw err; }
    setMockMonitoring(false);
  },

  retrain: async (payload: { datasetName?: string }) => {
    try { return await api.post<{ jobId: string }>("/api/retrain", payload); }
    catch (err) {
      if (err instanceof ApiUnavailableError) return { jobId: `mock-job-${Date.now()}` };
      throw err;
    }
  },
  uploadDataset: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try { return await api.post<{ datasetId: string; name: string }>("/api/datasets/upload", fd); }
    catch (err) {
      if (err instanceof ApiUnavailableError) return { datasetId: `mock-${Date.now()}`, name: file.name };
      throw err;
    }
  },

  currentModel: () => withFallback(() => api.get<ModelInfo>("/api/models/current"), mockCurrentModel, "model"),
  modelHistory: () => withFallback(() => api.get<ModelInfo[]>("/api/models/history"), mockModelHistory, "model-history"),
  promoteModel: async (version: string) => {
    try { await api.post(`/api/models/promote`, { version }); }
    catch (err) { if (!(err instanceof ApiUnavailableError)) throw err; }
  },

  acknowledgeAlert: async (id: string) => {
    try { await api.post(`/api/alerts/${id}/acknowledge`); }
    catch (err) { if (!(err instanceof ApiUnavailableError)) throw err; }
  },
  feedbackAlert: async (id: string, label: "true_attack" | "false_positive") => {
    try { await api.post(`/api/alerts/${id}/feedback`, { label }); }
    catch (err) { if (!(err instanceof ApiUnavailableError)) throw err; }
  },

  audit: () => withFallback(() => api.get<AuditEntry[]>("/api/audit/logs"), mockAudit, "audit"),
  systemHealth: () => withFallback(async () => mockHealth(), mockHealth, "system-health"),

  exportReport: async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${getConfig().apiBaseUrl}/api/reports/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.ok ? await res.blob() : null;
    } catch { return null; }
  },
};

export type TrendData = TrendPoint[];
