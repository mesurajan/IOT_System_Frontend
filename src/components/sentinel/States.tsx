import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingBlock({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 p-8 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/20 p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function BackendUnavailable({ feature }: { feature: string }) {
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-medium text-warning">{feature} — backend not available yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Showing demo data. Connect the API in <span className="font-mono">Settings</span> or set
        <span className="font-mono"> VITE_API_BASE_URL</span> in your <span className="font-mono">.env</span> file.
      </p>
    </div>
  );
}
