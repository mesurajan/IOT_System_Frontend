import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, ScrollText, Cpu, BarChart3,
  Settings, History, ShieldCheck, LogOut, ChevronLeft,
  Database, HeartPulse, Layers,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "./ConnectionStatus";
import { RoleBadge } from "./Badges";
import { getConfig } from "@/lib/config";

interface NavItem { to: string; label: string; icon: ReactNode; roles?: ("admin" | "analyst")[]; }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <Activity className="h-4 w-4" /> },
  { to: "/alerts", label: "Alerts", icon: <AlertTriangle className="h-4 w-4" /> },
  { to: "/logs", label: "Logs", icon: <ScrollText className="h-4 w-4" /> },
  { to: "/monitoring", label: "Monitoring", icon: <BarChart3 className="h-4 w-4" />, roles: ["admin"] },
  { to: "/retraining", label: "Retraining", icon: <Cpu className="h-4 w-4" />, roles: ["admin"] },
  { to: "/models", label: "Model Management", icon: <Layers className="h-4 w-4" />, roles: ["admin"] },
  { to: "/kibana", label: "Kibana", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/health", label: "System Health", icon: <HeartPulse className="h-4 w-4" />, roles: ["admin"] },
  { to: "/audit", label: "Audit History", icon: <History className="h-4 w-4" />, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export function AppLayout({ children, online }: { children: ReactNode; online: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const cfg = getConfig();

  const visibleNav = NAV.filter(n => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
        collapsed ? "w-16" : "w-64",
        "transition-[width] duration-200"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-primary-foreground shadow-elegant">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">{cfg.appName}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">IoT Security</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(c => !c)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <div className="md:hidden grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{currentTitle(location.pathname)}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{cfg.appName} · Real-Time Anomaly Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <ConnectionStatus online={online} />
            {user && (
              <div className="hidden items-center gap-2 rounded-md border border-border bg-secondary/50 px-2.5 py-1 sm:flex">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{user.displayName}</span>
                <RoleBadge role={user.role} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card/40 px-2 py-2 md:hidden">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function currentTitle(pathname: string): string {
  const m: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/alerts": "Alerts",
    "/logs": "Logs",
    "/monitoring": "Monitoring Control",
    "/retraining": "Model Retraining",
    "/models": "Model Management",
    "/kibana": "Kibana",
    "/health": "System Health",
    "/audit": "Audit History",
    "/settings": "Settings",
  };
  return m[pathname] ?? "Sentinel IoT";
}
