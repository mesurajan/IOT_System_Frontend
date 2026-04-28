import { useMemo } from "react";
import {
  Activity, AlertTriangle, ShieldCheck, Zap, Gauge, Server, RefreshCw, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { useAuth } from "@/auth/AuthContext";
import { sentinel } from "@/lib/sentinel";
import { usePolling } from "@/lib/hooks";
import { getConfig } from "@/lib/config";
import { StatCard } from "@/components/sentinel/StatCard";
import { LoadingBlock } from "@/components/sentinel/States";
import { SeverityBadge, StatusBadge } from "@/components/sentinel/Badges";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PIE_COLORS = [
  "hsl(187 92% 52%)", "hsl(173 80% 45%)", "hsl(210 95% 60%)",
  "hsl(38 95% 58%)", "hsl(280 80% 60%)", "hsl(0 84% 60%)", "hsl(142 70% 45%)",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

export default function Dashboard() {
  const { user } = useAuth();
  const cfg = getConfig();

  const stats = usePolling(() => sentinel.stats(), 8000);
  const trend = usePolling(() => sentinel.trend(), 15000);
  const protos = usePolling(() => sentinel.protocolDistribution(cfg.defaultLimit), 15000);
  const alerts = usePolling(() => sentinel.alerts(8), 10000);
  const logs = usePolling(() => sentinel.logs(8), 10000);

  const chartTrend = useMemo(() => (trend.data ?? []).map(p => ({
    ...p, label: format(new Date(p.time), "HH:mm"),
  })), [trend.data]);

  const isAdmin = user?.role === "admin";
  const s = stats.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Operational overview of the IoT detection pipeline." : "Live anomaly investigation workspace."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { stats.refresh(); trend.refresh(); protos.refresh(); alerts.refresh(); logs.refresh(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Traffic" value={s ? s.totalTraffic.toLocaleString() : "—"} icon={<Activity className="h-4 w-4" />} hint="last 24h" />
        <StatCard label="Normal" value={s ? s.normalTraffic.toLocaleString() : "—"} tone="success" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Anomalies" value={s ? s.anomalies.toLocaleString() : "—"} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Active Alerts" value={s ? s.activeAlerts : "—"} tone="warning" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Model Accuracy" value={s ? `${(s.modelAccuracy * 100).toFixed(1)}%` : "—"} tone="info" icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Latency" value={s ? `${s.latencyMs} ms` : "—"} tone="default" icon={<Server className="h-4 w-4" />} hint={s?.monitoring ? "Monitoring active" : "Monitoring paused"} />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Anomaly Trend</h2>
              <p className="text-xs text-muted-foreground">Normal vs anomalous traffic over time</p>
            </div>
          </div>
          {trend.loading ? <LoadingBlock /> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(187 92% 52%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(187 92% 52%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="normal" stroke="hsl(187 92% 52%)" fill="url(#gNormal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="anomaly" stroke="hsl(0 84% 60%)" fill="url(#gAnom)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Protocol Distribution</h2>
          <p className="text-xs text-muted-foreground">Share of traffic by protocol</p>
          {protos.loading ? <LoadingBlock /> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={protos.data ?? []} dataKey="count" nameKey="protocol" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {(protos.data ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Recent Traffic Activity</h2>
            <p className="text-xs text-muted-foreground">Bytes per protocol observed in latest window</p>
          </div>
        </div>
        {protos.loading ? <LoadingBlock /> : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={protos.data ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="protocol" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(187 92% 52%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Tables */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold">Recent Alerts</h2>
              <p className="text-xs text-muted-foreground">Latest detection events</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/alerts">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
          {alerts.loading ? <LoadingBlock className="m-4" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alerts.data ?? []).slice(0, 6).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(a.timestamp), "HH:mm:ss")}</TableCell>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell className="font-mono text-xs">{a.protocol}</TableCell>
                    <TableCell className="font-mono text-xs">{a.sourceIp}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold">Recent Logs</h2>
              <p className="text-xs text-muted-foreground">Latest classified flows</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/logs">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
          {logs.loading ? <LoadingBlock className="m-4" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Proto</TableHead>
                  <TableHead>Src → Dst</TableHead>
                  <TableHead className="text-right">Bytes</TableHead>
                  <TableHead>Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs.data ?? []).slice(0, 6).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{format(new Date(l.timestamp), "HH:mm:ss")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.protocol}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.sourceIp} → {l.destinationIp}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{l.bytes.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={l.classification === "anomaly" ? "text-destructive font-medium" : "text-success"}>
                        {l.classification}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
