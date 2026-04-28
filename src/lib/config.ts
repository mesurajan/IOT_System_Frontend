/**
 * Centralized runtime config.
 * Loads env first, then optionally overrides from `/api/config` at startup.
 * Never read import.meta.env directly inside components.
 */

export interface AppConfig {
  apiBaseUrl: string;
  kibanaUrl: string;
  appName: string;
  enableKibanaEmbed: boolean;
  defaultLimit: number;
  requestTimeoutMs: number;
  authMode: "mock" | "backend";
}

export interface ConfigState {
  config: AppConfig;
  source: "env" | "backend";
  errors: string[];
}

const env = import.meta.env;

function parseBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return fallback;
}

function parseInt2(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildFromEnv(): { config: AppConfig; errors: string[] } {
  const errors: string[] = [];
  const apiBaseUrl = (env.VITE_API_BASE_URL as string) || "";
  const kibanaUrl = (env.VITE_KIBANA_URL as string) || "";
  const appName = (env.VITE_APP_NAME as string) || "Sentinel IoT";

  if (!apiBaseUrl) errors.push("VITE_API_BASE_URL is not set");
  if (!kibanaUrl) errors.push("VITE_KIBANA_URL is not set");

  const authModeRaw = ((env.VITE_AUTH_MODE as string) || "mock").toLowerCase();
  const authMode: AppConfig["authMode"] = authModeRaw === "backend" ? "backend" : "mock";

  return {
    config: {
      apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
      kibanaUrl: kibanaUrl.replace(/\/$/, ""),
      appName,
      enableKibanaEmbed: parseBool(env.VITE_ENABLE_KIBANA_EMBED, true),
      defaultLimit: parseInt2(env.VITE_DEFAULT_LIMIT, 50),
      requestTimeoutMs: parseInt2(env.VITE_REQUEST_TIMEOUT_MS, 10000),
      authMode,
    },
    errors,
  };
}

let _state: ConfigState | null = null;

export function getConfig(): AppConfig {
  if (!_state) {
    const { config, errors } = buildFromEnv();
    _state = { config, source: "env", errors };
  }
  return _state.config;
}

export function getConfigState(): ConfigState {
  if (!_state) getConfig();
  return _state!;
}

/**
 * Attempt to merge runtime config from `GET /api/config`.
 * Backend values override env values when present. Silent-fail on errors.
 */
export async function loadRuntimeConfig(): Promise<ConfigState> {
  const base = getConfig();
  if (!base.apiBaseUrl) return getConfigState();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${base.apiBaseUrl}/api/config`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return getConfigState();
    const data = (await res.json()) as Partial<Record<string, unknown>>;
    const merged: AppConfig = {
      ...base,
      apiBaseUrl: typeof data.apiBaseUrl === "string" && data.apiBaseUrl ? String(data.apiBaseUrl).replace(/\/$/, "") : base.apiBaseUrl,
      kibanaUrl: typeof data.kibanaUrl === "string" && data.kibanaUrl ? String(data.kibanaUrl).replace(/\/$/, "") : base.kibanaUrl,
      appName: typeof data.appName === "string" ? String(data.appName) : base.appName,
      enableKibanaEmbed: data.enableKibanaEmbed != null ? parseBool(data.enableKibanaEmbed, base.enableKibanaEmbed) : base.enableKibanaEmbed,
      defaultLimit: data.defaultLimit != null ? parseInt2(data.defaultLimit, base.defaultLimit) : base.defaultLimit,
      requestTimeoutMs: data.requestTimeoutMs != null ? parseInt2(data.requestTimeoutMs, base.requestTimeoutMs) : base.requestTimeoutMs,
      authMode: data.authMode === "backend" || data.authMode === "mock" ? (data.authMode as AppConfig["authMode"]) : base.authMode,
    };
    _state = { config: merged, source: "backend", errors: _state?.errors ?? [] };
  } catch {
    /* ignore — keep env-based config */
  }
  return getConfigState();
}

/** Allow Settings page to override URLs in-session (persisted to localStorage). */
const OVERRIDE_KEY = "sentinel.config.override";
export function applyOverride(partial: Partial<Pick<AppConfig, "apiBaseUrl" | "kibanaUrl">>) {
  const cur = getConfig();
  const next: AppConfig = {
    ...cur,
    apiBaseUrl: (partial.apiBaseUrl ?? cur.apiBaseUrl).replace(/\/$/, ""),
    kibanaUrl: (partial.kibanaUrl ?? cur.kibanaUrl).replace(/\/$/, ""),
  };
  _state = { config: next, source: _state?.source ?? "env", errors: _state?.errors ?? [] };
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ apiBaseUrl: next.apiBaseUrl, kibanaUrl: next.kibanaUrl }));
  } catch { /* ignore */ }
}

export function loadOverrideFromStorage() {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    applyOverride(parsed);
  } catch { /* ignore */ }
}
