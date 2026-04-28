import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import { LoadingBlock } from "@/components/sentinel/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Models() {
  const current = usePolling(() => sentinel.currentModel(), 0);
  const history = usePolling(() => sentinel.modelHistory(), 0);
  const [working, setWorking] = useState<string | null>(null);

  const promote = async (version: string) => {
    setWorking(version);
    try { await sentinel.promoteModel(version); toast.success(`Promoted ${version} to production`); current.refresh(); history.refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setWorking(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Management</h1>
        <p className="text-sm text-muted-foreground">Review model history and promote validated candidates to production.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Production model</h2>
        {current.loading || !current.data ? <LoadingBlock className="mt-4" /> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Version" value={current.data.version} mono />
            <Field label="Algorithm" value={current.data.algorithm} />
            <Field label="Dataset" value={current.data.datasetName} mono />
            <Field label="Validation" value={`${(current.data.validationScore * 100).toFixed(2)}%`} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Training history</h2>
          <p className="text-xs text-muted-foreground">Promote a candidate to replace the production model.</p>
        </div>
        {history.loading ? <LoadingBlock className="m-4" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Trained</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history.data ?? []).map(m => (
                <TableRow key={m.version}>
                  <TableCell className="font-mono">{m.version}</TableCell>
                  <TableCell>{m.algorithm}</TableCell>
                  <TableCell className="font-mono text-xs">{m.datasetName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(m.trainedAt), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="font-mono">{(m.validationScore * 100).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "production" ? "default" : "outline"}
                      className={m.status === "production" ? "bg-success text-success-foreground" : ""}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {m.status !== "production" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={working === m.version}>
                            {working === m.version ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                            Promote
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Promote {m.version} to production?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The current production model will be archived. Live detection will switch to this version immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => promote(m.version)}>Promote</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
