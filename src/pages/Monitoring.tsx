import { useState } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import { StatCard } from "@/components/sentinel/StatCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Monitoring() {
  const stats = usePolling(() => sentinel.stats(), 5000);
  const [busy, setBusy] = useState<"start" | "stop" | null>(null);

  const start = async () => {
    setBusy("start");
    try { await sentinel.startMonitoring(); toast.success("Monitoring started"); stats.refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };
  const stop = async () => {
    setBusy("stop");
    try { await sentinel.stopMonitoring(); toast.success("Monitoring stopped"); stats.refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const monitoring = stats.data?.monitoring ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Monitoring Control</h1>
        <p className="text-sm text-muted-foreground">Start, stop and observe the live detection pipeline.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pipeline State" value={monitoring ? "Active" : "Paused"} tone={monitoring ? "success" : "warning"} hint="Real-time ingestion" />
        <StatCard label="Latency" value={stats.data ? `${stats.data.latencyMs} ms` : "—"} tone="info" />
        <StatCard label="Active Alerts" value={stats.data?.activeAlerts ?? "—"} tone="danger" />
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Pipeline operations</h2>
            <p className="text-sm text-muted-foreground">All actions are executed via the backend — no scripts, no shell access.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={start} disabled={busy !== null || monitoring} className="bg-success text-success-foreground hover:opacity-90">
              {busy === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Start Monitoring
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy !== null || !monitoring}>
                  {busy === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                  Stop Monitoring
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Stop the live detection pipeline?</AlertDialogTitle>
                  <AlertDialogDescription>
                    No new traffic will be analysed until monitoring is restarted. Existing alerts remain available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={stop}>Stop monitoring</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </div>
  );
}
