import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, ApiUnavailableError, setAuthToken } from "@/lib/api";
import { getConfig } from "@/lib/config";
import type { Role, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const STORAGE_KEY = "sentinel.auth.user";
const EXPIRY_KEY = "sentinel.auth.expires";
const SESSION_HOURS = 8;

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const exp = Number(localStorage.getItem(EXPIRY_KEY) || 0);
    if (!raw || !exp) return null;
    if (Date.now() > exp) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      setAuthToken(null);
      return null;
    }
    return JSON.parse(raw) as User;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(false);

  // Session expiry watcher
  useEffect(() => {
    const id = setInterval(() => {
      const exp = Number(localStorage.getItem(EXPIRY_KEY) || 0);
      if (exp && Date.now() > exp && user) {
        setUser(null);
        setAuthToken(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [user]);

  const login = useCallback(async (username: string, password: string, role: Role) => {
    setLoading(true);
    try {
      const cfg = getConfig();
      let resolved: User;
      let token = "";
      if (cfg.authMode === "backend") {
        try {
          const data = await api.post<{ token: string; user: User }>("/api/auth/login", { username, password, role });
          resolved = data.user;
          token = data.token;
        } catch (err) {
          if (err instanceof ApiUnavailableError) {
            // graceful fallback to mock if backend unreachable
            if (!username || !password) throw new ApiError("Username and password required", 400);
            resolved = { id: username, username, displayName: username, role };
            token = `mock-${Date.now()}`;
          } else throw err;
        }
      } else {
        if (!username || !password) throw new ApiError("Username and password required", 400);
        if (password.length < 4) throw new ApiError("Invalid credentials", 401);
        resolved = { id: username, username, displayName: username.replace(/\b\w/g, c => c.toUpperCase()), role };
        token = `mock-${Date.now()}`;
      }
      const expiry = Date.now() + SESSION_HOURS * 3600_000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      localStorage.setItem(EXPIRY_KEY, String(expiry));
      setAuthToken(token);
      setUser(resolved);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }, []);

  const value = useMemo<AuthState>(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
