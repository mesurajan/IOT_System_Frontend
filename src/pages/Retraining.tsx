import { useRef, useState } from "react";
import { Upload, Cpu, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import { StatCard } from "@/components/sentinel/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const PRESET_DATASETS = [
  "iot-traffic-2025-q2",
  "iot-traffic-2025-q1",
  "iot-traffic-2024-q4",
  "synthetic-mqtt-attacks",
];

export default function Retraining() {
  const current = usePolling(() => sentinel.currentModel(), 0);
  const [dataset, setDataset] = useState(PRESET_DATASETS[0]);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const r = await sentinel.uploadDataset(file);
      setUploadName(r.name);
      setDataset(r.name);
      toast.success(`Dataset uploaded: ${r.name}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const trigger = async () => {
    setBusy(true);
    try {
      const r = await sentinel.retrain({ datasetName: dataset });
      toast.success(`Retraining started — job ${r.jobId}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const m = current.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Retraining</h1>
        <p className="text-sm text-muted-foreground">Upload or select a dataset and trigger a retraining job through the API.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current Version" value={m?.version ?? "—"} tone="info" hint={m?.algorithm} />
        <StatCard label="Last Trained" value={m ? format(new Date(m.trainedAt), "MMM d, HH:mm") : "—"} />
        <StatCard label="Validation Score" value={m ? `${(m.validationScore * 100).toFixed(1)}%` : "—"} tone="success" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">1. Choose dataset</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a curated dataset or upload your own labelled traffic.</p>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Preset dataset</Label>
              <Select value={dataset} onValueChange={setDataset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESET_DATASETS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  {uploadName && <SelectItem value={uploadName}>{uploadName} (uploaded)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Upload new dataset</Label>
              <div className="flex gap-2">
                <Input ref={fileRef} type="file" accept=".csv,.parquet,.json,.zip" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">2. Trigger retraining</h2>
          <p className="mt-1 text-xs text-muted-foreground">A confirmation is required. Training runs server-side; you'll be notified when complete.</p>

          <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected dataset</p>
            <p className="mt-1 font-mono">{dataset}</p>
          </div>

          <div className="mt-4 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy} className="bg-gradient-primary text-primary-foreground">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
                  Retrain Model
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Trigger model retraining?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will queue a new training job using <span className="font-mono">{dataset}</span>. Existing production model remains active until you promote a new candidate.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={trigger}>Start retraining</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </div>
  );
}
