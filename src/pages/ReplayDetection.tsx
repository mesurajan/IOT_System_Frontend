import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Database, Loader2, Play, RefreshCw, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import type { DetectionJob } from "@/lib/types";
import { StatCard } from "@/components/sentinel/StatCard";
import { TimeRangePicker } from "@/components/sentinel/TimeRangePicker";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REPLAY_JOB_KEY = "sentinel.activeReplayJobId";
const REPLAY_MULTI_MODE_KEY = "sentinel.replay.multiDatasetMode";
const REPLAY_SELECTED_IDS_KEY = "sentinel.replay.selectedDatasetIds";
const REPLAY_QUEUE_KEY = "sentinel.replay.queueState";
const FINISHED_STATUSES = ["completed", "failed", "stopped"];

type ReplayQueueState = {
  datasetIds: string[];
  currentIndex: number;
};

function readJsonArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readReplayQueue(): ReplayQueueState | null {
  try {
    const raw = localStorage.getItem(REPLAY_QUEUE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReplayQueueState>;
    const datasetIds = Array.isArray(parsed.datasetIds) ? parsed.datasetIds.map(item => String(item)).filter(Boolean) : [];
    const currentIndex = Number.isFinite(Number(parsed.currentIndex)) ? Math.max(0, Number(parsed.currentIndex)) : 0;
    return datasetIds.length ? { datasetIds, currentIndex } : null;
  } catch {
    return null;
  }
}

export default function ReplayDetection() {
  const [logsLimit, setLogsLimit] = useState(50);
  const [rangeMinutes, setRangeMinutes] = useState(() => {
  const saved = localStorage.getItem("alerts.rangeMinutes");
  return saved ? Number(saved) : 15;
});


useEffect(() => {
  localStorage.setItem("alerts.rangeMinutes", String(rangeMinutes));
}, [rangeMinutes]);

  const stats = usePolling(() => sentinel.stats(rangeMinutes, "dataset_replay"), 5000, [rangeMinutes]);
  const logs = usePolling(() => sentinel.logs(logsLimit, rangeMinutes, "dataset_replay"), 8000, [rangeMinutes, logsLimit]);
  const refreshStats = stats.refresh;
  const refreshLogs = logs.refresh;
  const datasets = usePolling(() => sentinel.datasets(), 0);
  const currentModel = usePolling(() => sentinel.currentModel(), 0);
  const modelHistory = usePolling(() => sentinel.modelHistory(), 0);
  const [datasetId, setDatasetId] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [job, setJob] = useState<DetectionJob | null>(null);
  const [busy, setBusy] = useState<"upload" | "start" | "stop" | "delete" | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [multiDatasetMode, setMultiDatasetMode] = useState(() => localStorage.getItem(REPLAY_MULTI_MODE_KEY) === "true");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>(() => readJsonArray(REPLAY_SELECTED_IDS_KEY));
  const [replayQueue, setReplayQueue] = useState<ReplayQueueState | null>(() => readReplayQueue());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    description: string;
    logIds: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const advancingReplayRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(REPLAY_MULTI_MODE_KEY, String(multiDatasetMode));
  }, [multiDatasetMode]);

  useEffect(() => {
    localStorage.setItem(REPLAY_SELECTED_IDS_KEY, JSON.stringify(selectedDatasetIds));
  }, [selectedDatasetIds]);

  const leaveWarningMessage = "Replay detection is still running. Are you sure you want to leave the page?";
  const activeReplayDatasets = multiDatasetMode
    ? (datasets.data ?? []).filter(item => selectedDatasetIds.includes(item.id))
    : (datasets.data ?? []).find(item => item.id === datasetId)
      ? [(datasets.data ?? []).find(item => item.id === datasetId)!]
      : [];

  const persistQueue = useCallback((queue: ReplayQueueState | null) => {
    setReplayQueue(queue);
    if (queue) {
      localStorage.setItem(REPLAY_QUEUE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(REPLAY_QUEUE_KEY);
    }
  }, []);

  const startReplayForDataset = useCallback(async (targetDatasetId: string, queueState?: ReplayQueueState) => {
    if (!targetDatasetId) return;
    setBusy("start");
    try {
      const result = await sentinel.startDatasetDetection({ dataset: "raw", datasetId: targetDatasetId, delay: 0.1, reportEvery: 50, modelVersion });
      localStorage.setItem(REPLAY_JOB_KEY, result.jobId);
      if (queueState) persistQueue(queueState);
      const modelInfo = modelHistory.data?.find(item => item.version === modelVersion) ?? currentModel.data;
      setJob({
        jobId: result.jobId,
        mode: "dataset",
        status: "queued",
        logs: `[INFO] Dataset detection queued for ${datasets.data?.find(item => item.id === targetDatasetId)?.name ?? targetDatasetId}`,
        modelVersion,
        modelAlgorithm: modelInfo?.algorithm,
        modelDataset: modelInfo?.datasetName,
        datasetId: targetDatasetId,
        stage: "queued",
        stageLabel: "Dataset queued",
        progress: queueState ? Math.round(((queueState.currentIndex + 1) / queueState.datasetIds.length) * 100) : 0,
      });
      toast.success(queueState ? `Queued ${queueState.currentIndex + 1} of ${queueState.datasetIds.length}` : "Dataset replay started");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }, [currentModel.data, datasets.data, modelHistory.data, modelVersion, persistQueue]);

  useEffect(() => {
    if (!datasetId && datasets.data?.length) setDatasetId(datasets.data[0].id);
  }, [datasetId, datasets.data]);

  useEffect(() => {
    if (modelVersion) return;
    const production = modelHistory.data?.find(item => item.status === "production");
    const fallback = currentModel.data?.version || production?.version || modelHistory.data?.[0]?.version || "";
    if (fallback) setModelVersion(fallback);
  }, [currentModel.data, modelHistory.data, modelVersion]);

  const selectedDataset = datasets.data?.find(item => item.id === datasetId);

  useEffect(() => {
    const availableLogIds = new Set((logs.data ?? []).map(item => item.id));
    setSelectedLogIds(previous => previous.filter(id => availableLogIds.has(id)));
  }, [logs.data]);

  useEffect(() => {
    if (!deleteMode) {
      setSelectedLogIds([]);
    }
  }, [deleteMode]);

  useEffect(() => {
    let cancelled = false;
    async function restoreJob() {
      const savedJobId = localStorage.getItem(REPLAY_JOB_KEY);
      if (!savedJobId) return;
      try {
        const latest = await sentinel.detectionJob(savedJobId);
        if (cancelled || latest.mode !== "dataset") return;
        setJob(latest);
        if (FINISHED_STATUSES.includes(latest.status)) {
          localStorage.removeItem(REPLAY_JOB_KEY);
        }
      } catch {
        localStorage.removeItem(REPLAY_JOB_KEY);
      }
    }
    restoreJob();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!job?.jobId || !replayQueue || job.status !== "completed") return;

    if (advancingReplayRef.current) return;
    advancingReplayRef.current = true;

    const nextIndex = replayQueue.currentIndex + 1;
    if (nextIndex >= replayQueue.datasetIds.length) {
      localStorage.removeItem(REPLAY_JOB_KEY);
      persistQueue(null);
      advancingReplayRef.current = false;
      return;
    }

    const nextQueue = { datasetIds: replayQueue.datasetIds, currentIndex: nextIndex };
    persistQueue(nextQueue);
    void startReplayForDataset(nextQueue.datasetIds[nextIndex], nextQueue).finally(() => {
      advancingReplayRef.current = false;
    });
  }, [job?.jobId, job?.status, replayQueue, persistQueue, startReplayForDataset]);

  useEffect(() => {
    const activeReplay = Boolean(job?.jobId && !FINISHED_STATUSES.includes(job.status)) || Boolean(replayQueue && replayQueue.currentIndex < replayQueue.datasetIds.length);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!activeReplay) return;
      event.preventDefault();
      event.returnValue = leaveWarningMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [job?.jobId, job?.status, replayQueue, leaveWarningMessage]);

  useEffect(() => {
    if (!job?.jobId || FINISHED_STATUSES.includes(job.status)) return;
    localStorage.setItem(REPLAY_JOB_KEY, job.jobId);
    const id = setInterval(async () => {
      try {
        const latest = await sentinel.detectionJob(job.jobId);
        setJob(latest);
        if (FINISHED_STATUSES.includes(latest.status)) localStorage.removeItem(REPLAY_JOB_KEY);
        refreshStats();
        refreshLogs();
      } catch (error) {
        toast.error((error as Error).message);
      }
    }, 2500);
    return () => clearInterval(id);
  }, [job?.jobId, job?.status, refreshLogs, refreshStats]);

  useEffect(() => {
    if (job?.status !== "completed" || !replayQueue || advancingReplayRef.current) return;

    const nextIndex = replayQueue.currentIndex + 1;
    if (nextIndex >= replayQueue.datasetIds.length) {
      persistQueue(null);
      return;
    }

    advancingReplayRef.current = true;
    const nextQueue = { datasetIds: replayQueue.datasetIds, currentIndex: nextIndex };
    persistQueue(nextQueue);
    void startReplayForDataset(nextQueue.datasetIds[nextIndex], nextQueue).finally(() => {
      advancingReplayRef.current = false;
    });
  }, [job?.status, replayQueue, persistQueue, startReplayForDataset]);

  const selectedModel = modelHistory.data?.find(item => item.version === modelVersion) ?? currentModel.data;
  const running = job ? ["queued", "running"].includes(job.status) : false;
  const activeReplay = running || Boolean(replayQueue && replayQueue.currentIndex < replayQueue.datasetIds.length);
  const visibleLogs = logs.data ?? [];
  const selectedCount = selectedLogIds.length;
  const allLogsSelected = visibleLogs.length > 0 && selectedCount === visibleLogs.length;
  const someLogsSelected = selectedCount > 0 && selectedCount < visibleLogs.length;
  const currentReplayIndex = replayQueue ? Math.min(replayQueue.currentIndex + 1, replayQueue.datasetIds.length) : 0;

  const toggleLogSelection = (logId: string) => {
    setSelectedLogIds(previous => (
      previous.includes(logId)
        ? previous.filter(id => id !== logId)
        : [...previous, logId]
    ));
  };

  const setAllLogSelections = (checked: boolean) => {
    setSelectedLogIds(checked ? visibleLogs.map(item => item.id) : []);
  };

  const deleteLogsById = async (logIds: string[]) => {
    if (!logIds.length) {
      toast.info("Select at least one detection log to delete");
      return;
    }

    setBusy("delete");
    try {
      const result = await sentinel.deleteLogs(logIds);
      if (result.deleted > 0) {
        toast.success(result.deleted === 1 ? "Detection log deleted" : `Deleted ${result.deleted} detection logs`);
      } else {
        toast.info("No detection logs were deleted");
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} detection logs could not be deleted`);
      }
      setDeleteMode(false);
      setSelectedLogIds([]);
      refreshLogs();
      refreshStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete detection logs");
    } finally {
      setBusy(null);
    }
  };

  const deleteSelectedLogs = () => {
    if (!selectedLogIds.length) {
      toast.info("Select at least one detection log to delete");
      return;
    }

    setDeleteConfirm({
      title: selectedLogIds.length === 1 ? "Delete selected detection log?" : `Delete ${selectedLogIds.length} selected detection logs?`,
      description: "This permanently removes the selected detection logs from Elasticsearch.",
      logIds: selectedLogIds,
    });
  };

  const deleteSingleLog = (timestamp: string, logId: string) => {
    setDeleteConfirm({
      title: `Delete detection log at ${format(new Date(timestamp), "HH:mm:ss")}?`,
      description: "This permanently removes this detection event from Elasticsearch.",
      logIds: [logId],
    });
  };

  const refreshAll = () => {
    refreshStats();
    refreshLogs();
    datasets.refresh();
  };

  const onUpload = async (file: File) => {
    setBusy("upload");
    try {
      const result = await sentinel.uploadDataset(file);
      await datasets.refresh();
      setDatasetId(result.datasetId);
      toast.success(`Dataset uploaded: ${result.name}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startReplay = async () => {
    if (running || busy !== null) return;

    const targetIds = multiDatasetMode ? selectedDatasetIds : [datasetId].filter(Boolean);
    if (!targetIds.length) {
      toast.info("Select at least one dataset to replay");
      return;
    }

    const queueState = targetIds.length > 1 ? { datasetIds: targetIds, currentIndex: 0 } : null;
    if (queueState) {
      persistQueue(queueState);
    } else {
      persistQueue(null);
    }

    await startReplayForDataset(targetIds[0], queueState ?? undefined);
  };

  const stopReplay = async () => {
    setBusy("stop");
    try {
      await sentinel.stopMonitoring(job?.jobId);
      localStorage.removeItem(REPLAY_JOB_KEY);
      persistQueue(null);
      if (job) setJob({ ...job, status: "stopped", logs: `${job.logs ?? ""}\n[INFO] Stop requested` });
      toast.success("Replay stopped");
      refreshAll();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy === "delete"}
              onClick={() => {
                const ids = deleteConfirm?.logIds ?? [];
                setDeleteConfirm(null);
                void deleteLogsById(ids);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dataset Replay Detection</h1>
          <p className="text-sm text-muted-foreground">Upload or choose a labelled CSV dataset, replay it through the model, and store results in Elasticsearch.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TimeRangePicker rangeMinutes={rangeMinutes} onRangeChange={setRangeMinutes} onRefresh={refreshAll} />
          <Button variant="outline" size="sm" className="h-10" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Replay State" value={activeReplay ? "Active" : "Paused"} tone={activeReplay ? "success" : "warning"} hint={job?.jobId ?? "No active replay"} />
        <StatCard label="Events In Range" value={stats.data?.totalTraffic?.toLocaleString() ?? "-"} tone="info" />
        <StatCard label="Anomalies In Range" value={stats.data?.anomalies?.toLocaleString() ?? "-"} tone="danger" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Replay source</h2>
          <p className="mt-1 text-xs text-muted-foreground">Preset and uploaded CSV files are read by the backend detector.</p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Dataset</Label>
              <Select value={datasetId} onValueChange={setDatasetId} disabled={datasets.loading || !datasets.data?.length}>
                <SelectTrigger><SelectValue placeholder="Select a dataset" /></SelectTrigger>
                <SelectContent>
                  {(datasets.data ?? []).map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name} ({item.source})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
              <Checkbox
                id="multi-dataset-mode"
                checked={multiDatasetMode}
                onCheckedChange={value => setMultiDatasetMode(Boolean(value))}
              />
              <Label htmlFor="multi-dataset-mode" className="cursor-pointer">Multi Dataset Mode</Label>
            </div>

            {multiDatasetMode && (
              <div className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Select one or more datasets for sequential replay
                </div>
                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {(datasets.data ?? []).map(item => (
                    <label key={item.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-2 text-sm hover:bg-secondary/30">
                      <Checkbox
                        checked={selectedDatasetIds.includes(item.id)}
                        onCheckedChange={checked => setSelectedDatasetIds(previous => checked ? Array.from(new Set([...previous, item.id])) : previous.filter(id => id !== item.id))}
                      />
                      <span className="truncate">{item.name} <span className="text-muted-foreground">({item.source})</span></span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{selectedDatasetIds.length} selected</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Detection model</Label>
              <Select value={modelVersion} onValueChange={setModelVersion} disabled={modelHistory.loading || !modelHistory.data?.length}>
                <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
                <SelectContent>
                  {(modelHistory.data ?? []).map(item => (
                    <SelectItem key={item.version} value={item.version}>
                      {item.version} ({item.algorithm}) - {item.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedModel ? `Using ${selectedModel.version} (${selectedModel.algorithm}).` : "Choose the model for this replay run."}
              </p>
            </div>

            {selectedDataset && (
              <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <Database className="h-3.5 w-3.5" /> {selectedDataset.filename}
                </div>
                <p className="mt-1 text-muted-foreground">{selectedDataset.path}</p>
                <p className="mt-1 text-muted-foreground">{(selectedDataset.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}

            {multiDatasetMode && activeReplayDatasets.length > 0 && (
              <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
                <div className="font-medium">Selected datasets</div>
                <p className="mt-1 text-muted-foreground">{activeReplayDatasets.length} dataset(s) selected for replay.</p>
                <div className="mt-2 space-y-1">
                  {activeReplayDatasets.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded bg-background/60 px-2 py-1">
                      <span className="truncate">{item.name}</span>
                      <span className="text-muted-foreground">{(item.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Upload labelled CSV</Label>
              <div className="flex gap-2">
                <Input ref={fileRef} type="file" accept=".csv" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
                <Button variant="outline" disabled={busy === "upload"} onClick={() => fileRef.current?.click()}>
                  {busy === "upload" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={startReplay} disabled={busy !== null || activeReplay || (!multiDatasetMode ? !datasetId : selectedDatasetIds.length === 0)} className="bg-success text-success-foreground hover:opacity-90">
                {busy === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Start Replay Detection
              </Button>
              <Button variant="destructive" onClick={stopReplay} disabled={!(activeReplay || running || replayQueue) || busy !== null}>
                {busy === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                Stop
              </Button>
            </div>

          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Replay logs</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live replay output stays visible here, even before a scan starts.
          </p>

          <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected dataset</p>
            <p className="mt-1 font-mono">
              {multiDatasetMode
                ? (activeReplayDatasets.length ? `${activeReplayDatasets.length} dataset(s) selected` : "No dataset selected")
                : (selectedDataset?.name ?? "No dataset selected")}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Selected model</p>
            <p className="mt-1 font-mono">{selectedModel ? `${selectedModel.version} (${selectedModel.algorithm})` : modelVersion}</p>
          </div>

          <div className="mt-4 rounded-md border border-border bg-background">
            <div className="border-b border-border px-4 py-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Replay log</p>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              {job?.logs || "Replay logs will appear here live."}
            </pre>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Recent Detection Events</h2>
            <p className="text-xs text-muted-foreground">Events stored in Elasticsearch for the selected time range.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(logsLimit)} onValueChange={(v) => setLogsLimit(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>Limit {n}</SelectItem>)}
              </SelectContent>
            </Select>
            {deleteMode ? (
              <>
                <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
                <Button variant="outline" size="sm" onClick={() => setDeleteMode(false)} disabled={busy === "delete"}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelectedLogs} disabled={busy === "delete" || selectedCount === 0}>
                  {busy === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete Selected
                </Button>
              </>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setDeleteMode(true)} disabled={busy === "delete" || !visibleLogs.length}>
                <Trash2 className="mr-2 h-4 w-4" />
                Select to Delete
              </Button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {deleteMode && (
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all detection logs"
                    checked={allLogsSelected ? true : someLogsSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => setAllLogSelections(checked === true)}
                  />
                </TableHead>
              )}
              <TableHead>Time</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Class</TableHead>
              {!deleteMode && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLogs.map(item => (
              <TableRow key={item.id}>
                {deleteMode && (
                  <TableCell className="w-12">
                    <Checkbox
                      aria-label={`Select detection log at ${format(new Date(item.timestamp), "HH:mm:ss")}`}
                      checked={selectedLogIds.includes(item.id)}
                      onCheckedChange={() => toggleLogSelection(item.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">{format(new Date(item.timestamp), "HH:mm:ss")}</TableCell>
                <TableCell className="font-mono text-xs">{item.protocol}</TableCell>
                <TableCell className="font-mono text-xs">{item.sourceIp}</TableCell>
                <TableCell className="font-mono text-xs">{item.destinationIp}</TableCell>
                <TableCell className={item.classification === "anomaly" ? "font-medium text-destructive" : "text-success"}>{item.classification}</TableCell>
                {!deleteMode && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Delete detection log at ${format(new Date(item.timestamp), "HH:mm:ss")}`}
                      disabled={busy === "delete"}
                      onClick={() => deleteSingleLog(item.timestamp, item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
