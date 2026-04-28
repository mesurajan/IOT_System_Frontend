import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  hint?: string;
}

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export function StatCard({ label, value, delta, icon, tone = "default", hint }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("rounded-md bg-secondary/60 p-2.5 ring-1 ring-border", toneClass[tone])}>
            {icon}
          </div>
        )}
      </div>
      {delta && (
        <p className={cn("mt-3 text-xs font-medium", toneClass[tone])}>{delta}</p>
      )}
    </div>
  );
}
