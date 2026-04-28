import { format } from "date-fns";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import { LoadingBlock } from "@/components/sentinel/States";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Audit() {
  const { data, loading } = usePolling(() => sentinel.audit(), 30000);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit History</h1>
        <p className="text-sm text-muted-foreground">Every operational action is recorded for traceability.</p>
      </div>
      <div className="rounded-lg border border-border bg-card">
        {loading ? <LoadingBlock className="m-4" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{format(new Date(e.timestamp), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                  <TableCell className="font-medium">{e.actor}</TableCell>
                  <TableCell className="font-mono text-xs">{e.action}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.target ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.outcome === "success" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                      {e.outcome}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
