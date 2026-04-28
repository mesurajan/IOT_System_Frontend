import { cn } from "@/lib/utils";

export function ConnectionStatus({ online, label }: { online: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium">
      <span className={cn("pulse-dot", online ? "text-success" : "text-destructive")} />
      <span className="text-muted-foreground">{label ?? (online ? "Backend connected" : "Backend offline")}</span>
    </span>
  );
}
