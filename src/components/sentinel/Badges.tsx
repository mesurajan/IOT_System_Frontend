import { cn } from "@/lib/utils";
import type { AlertSeverity, AlertStatus } from "@/lib/types";

const severityMap: Record<AlertSeverity, string> = {
  low: "bg-info/15 text-info border-info/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground border-destructive",
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide", severityMap[severity])}>
      {severity}
    </span>
  );
}

const statusMap: Record<AlertStatus, string> = {
  open: "bg-secondary text-foreground border-border",
  acknowledged: "bg-info/15 text-info border-info/30",
  true_attack: "bg-destructive/15 text-destructive border-destructive/30",
  false_positive: "bg-success/15 text-success border-success/30",
};

export function StatusBadge({ status }: { status: AlertStatus }) {
  const label = status.replace("_", " ");
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize", statusMap[status])}>
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: "admin" | "analyst" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
      role === "admin"
        ? "border-primary/40 bg-primary/15 text-primary"
        : "border-info/40 bg-info/10 text-info"
    )}>
      {role}
    </span>
  );
}
