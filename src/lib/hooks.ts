import { useEffect, useState } from "react";
import { sentinel } from "@/lib/sentinel";
import { ApiUnavailableError } from "@/lib/api";
import { getConfig } from "@/lib/config";

/** Track backend reachability via /api/health polling. */
export function useBackendStatus(intervalMs = 15000) {
  const [online, setOnline] = useState<boolean>(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cfg = getConfig();
    if (!cfg.apiBaseUrl) { setOnline(false); setChecked(true); return; }

    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`${cfg.apiBaseUrl}/api/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    ping();
    const id = setInterval(ping, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return { online, checked };
}

/** Generic auto-refreshing data hook. */
export function usePolling<T>(loader: () => Promise<{ data: T; degraded: boolean }>, intervalMs = 10000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        const r = await loader();
        if (cancelled) return;
        setData(r.data);
        setDegraded(r.degraded);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof ApiUnavailableError ? "Backend unavailable" : (e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    if (intervalMs > 0) id = setInterval(run, intervalMs);
    return () => { cancelled = true; if (id) clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await loader();
      setData(r.data);
      setDegraded(r.degraded);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiUnavailableError ? "Backend unavailable" : (e as Error).message);
    } finally { setLoading(false); }
  };

  return { data, degraded, error, loading, refresh };
}
