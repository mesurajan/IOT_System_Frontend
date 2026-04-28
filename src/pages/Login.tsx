import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ShieldCheck, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConfig, getConfigState } from "@/lib/config";
import type { Role } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().min(2, "Username must be at least 2 characters").max(64),
  password: z.string().min(4, "Password must be at least 4 characters").max(128),
  role: z.enum(["admin", "analyst"]),
});

export default function Login() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = getConfig();
  const cfgState = getConfigState();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"username" | "password" | "form", string>>>({});

  if (user) {
    const from = (location.state as { from?: string } | null)?.from || "/dashboard";
    navigate(from, { replace: true });
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ username, password, role });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.errors.forEach(err => {
        const key = err.path[0] as "username" | "password";
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    try {
      await login(parsed.data.username, parsed.data.password, parsed.data.role);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrors({ form: (err as Error).message || "Authentication failed" });
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden border-r border-border bg-gradient-surface lg:block">
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-gradient-primary shadow-elegant">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{cfg.appName}</p>
              <p className="text-xs text-muted-foreground">Real-Time Traffic Anomaly Detection</p>
            </div>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Detect anomalies across <span className="text-primary glow-text">IoT networks</span> in real time.
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Continuous traffic monitoring, model-driven detection, and analyst-grade investigation tools — built for security teams, not for terminals.
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { k: "Models", v: "Hybrid CNN-LSTM" },
                { k: "Latency", v: "<100ms" },
                { k: "Coverage", v: "7 protocols" },
              ].map(s => (
                <div key={s.k} className="rounded-md border border-border bg-card/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.k}</p>
                  <p className="mt-1 font-mono text-sm">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Secured by role-based access · Session expiry · Audit-logged actions
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in to your console</h2>
            <p className="text-sm text-muted-foreground">Use your assigned credentials and role.</p>
          </div>

          {cfgState.errors.length > 0 && (
            <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Configuration warning</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {cfgState.errors.map(e => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                aria-invalid={!!errors.username}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When backend auth is enabled, the role is verified against the server response.
              </p>
            </div>

            {errors.form && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.form}
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <div className="rounded-md border border-border bg-card/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Demo mode</p>
            <p className="mt-0.5">Auth mode: <span className="font-mono">{cfg.authMode}</span>. Any username + password (≥4 chars) works in mock mode.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
