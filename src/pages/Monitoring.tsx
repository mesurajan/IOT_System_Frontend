import { useEffect, useState } from "react";
import { Loader2, Play, RadioTower, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import type { DetectionJob } from "@/lib/types";
import { StatCard } from "@/components/sentinel/StatCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DETECTION_JOB_KEY = "sentinel.activeDetectionJobId";
const FINISHED_STATUSES = ["completed", "failed", "stopped"];

export default function Monitoring() {
  const stats = usePolling(() => sentinel.stats(), 5000);
  const wireshark = usePolling(() => sentinel.wiresharkInterfaces(), 0);
  const [datasetMode, setDatasetMode] = useState<"raw" | "sample">("raw");
  const [interfaceId, setInterfaceId] = useState("");
  const [job, setJob] = useState<DetectionJob | null>(null);
  const [busy, setBusy] = useState<"dataset" | "wireshark" | "stop" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function restoreJob() {
      try {
        const savedJobId = localStorage.getItem(DETECTION_JOB_KEY);
        const latest = savedJobId
          ? await sentinel.detectionJob(savedJobId)
          : await sentinel.latestDetectionJob();
        if (cancelled || !latest) return;
        setJob(latest);
        if (FINISHED_STATUSES.includes(latest.status)) localStorage.removeItem(DETECTION_JOB_KEY);
        else localStorage.setItem(DETECTION_JOB_KEY, latest.jobId);
      } catch {
        try {
          const latest = await sentinel.latestDetectionJob();
          if (!cancelled && latest) {
            setJob(latest);
            localStorage.setItem(DETECTION_JOB_KEY, latest.jobId);
          }
        } catch { /* keep the page usable if there is no restorable job */ }
      }
    }
    restoreJob();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!interfaceId && wireshark.data?.interfaces?.length) {
      setInterfaceId(wireshark.data.interfaces[0].id);
    }
  }, [interfaceId, wireshark.data]);

  useEffect(() => {
    if (!job?.jobId || FINISHED_STATUSES.includes(job.status)) return;
    localStorage.setItem(DETECTION_JOB_KEY, job.jobId);
    const id = setInterval(async () => {
      try {
        const latest = await sentinel.detectionJob(job.jobId);
        setJob(latest);
        if (FINISHED_STATUSES.includes(latest.status)) localStorage.removeItem(DETECTION_JOB_KEY);
        stats.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [job?.jobId, job?.status]);

  const monitoring = job ? ["queued", "running"].includes(job.status) : false;

  const startDataset = async () => {
    setBusy("dataset");
    try {
      const r = await sentinel.startDatasetDetection({ dataset: datasetMode, delay: 0.1, reportEvery: 50 });
      localStorage.setItem(DETECTION_JOB_KEY, r.jobId);
      setJob({ jobId: r.jobId, mode: "dataset", status: "queued", logs: "[INFO] Dataset detection queued" });
      toast.success("Dataset detection started");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const startWireshark = async () => {
    if (!interfaceId) return;
    setBusy("wireshark");
    try {
      const r = await sentinel.startWiresharkDetection({ interfaceId, maxPackets: 200 });
      localStorage.setItem(DETECTION_JOB_KEY, r.jobId);
      setJob({ jobId: r.jobId, mode: "wireshark", status: "queued", logs: "[INFO] Live Wireshark capture queued" });
      toast.success("Live Wireshark detection started");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const stop = async () => {
    setBusy("stop");
    try {
      await sentinel.stopMonitoring(job?.jobId);
      localStorage.removeItem(DETECTION_JOB_KEY);
      if (job) setJob({ ...job, status: "stopped", logs: `${job.logs ?? ""}\n[INFO] Stop requested` });
      toast.success("Detection stopped");
      stats.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detection & Live Capture</h1>
          <p className="text-sm text-muted-foreground">Run replay detection or choose a Wireshark device for live packet detection.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { stats.refresh(); wireshark.refresh(); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pipeline State" value={monitoring ? "Active" : "Paused"} tone={monitoring ? "success" : "warning"} hint={job?.mode ?? "No active job"} />
        <StatCard label="Total Events" value={stats.data?.totalTraffic?.toLocaleString() ?? "-"} tone="info" />
        <StatCard label="Active Alerts" value={stats.data?.activeAlerts ?? "-"} tone="danger" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Dataset replay detection</h2>
          <p className="mt-1 text-xs text-muted-foreground">Runs the saved model against backend CSV data and stores predictions in Elasticsearch.</p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Replay source</Label>
              <Select value={datasetMode} onValueChange={(v) => setDatasetMode(v as "raw" | "sample")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">Backend/data/raw</SelectItem>
                  <SelectItem value="sample">Backend/data/sample</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startDataset} disabled={busy !== null || monitoring} className="bg-success text-success-foreground hover:opacity-90">
              {busy === "dataset" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Start Dataset Detection
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Live Wireshark detection</h2>
          <p className="mt-1 text-xs text-muted-foreground">First load devices, choose an interface, then start live packet capture.</p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Capture device</Label>
              <Select value={interfaceId} onValueChange={setInterfaceId} disabled={!wireshark.data?.available || !wireshark.data.interfaces.length}>
                <SelectTrigger><SelectValue placeholder="No devices available" /></SelectTrigger>
                <SelectContent>
                  {(wireshark.data?.interfaces ?? []).map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.id}. {item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!wireshark.data?.available && (
                <p className="text-xs text-destructive">{wireshark.data?.message ?? "Wireshark/tshark is not available to the backend."}</p>
              )}
            </div>
            <Button onClick={startWireshark} disabled={busy !== null || monitoring || !wireshark.data?.available || !interfaceId}>
              {busy === "wireshark" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RadioTower className="mr-2 h-4 w-4" />}
              Start Live Wireshark
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Detection result</h2>
            <p className="text-xs text-muted-foreground">{job ? `${job.jobId} - ${job.status}` : "Start dataset or live detection to see output here."}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={stop} disabled={!monitoring || busy !== null}>
            {busy === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Stop
          </Button>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {job?.logs || "Detection logs will appear here live."}
        </pre>
      </section>
    </div>
  );
}
