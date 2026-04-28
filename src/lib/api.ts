import { getConfig } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class ApiUnavailableError extends ApiError {
  constructor(message = "Backend not reachable") {
    super(message, 0);
  }
}

const TOKEN_KEY = "sentinel.auth.token";

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const cfg = getConfig();
  if (!cfg.apiBaseUrl) throw new ApiUnavailableError("API base URL not configured");

  const url = new URL(path.startsWith("http") ? path : `${cfg.apiBaseUrl}${path}`);
  if (opts.query) {
    Object.entries(opts.query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? cfg.requestTimeoutMs);

  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type") && opts.body && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const res = await fetch(url.toString(), { ...opts, headers, signal: ctrl.signal });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message || data?.error) message = data.message || data.error;
      } catch { /* ignore */ }
      throw new ApiError(message, res.status);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new ApiUnavailableError("Request timed out");
    if (err instanceof ApiError) throw err;
    throw new ApiUnavailableError((err as Error).message);
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => apiRequest<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
