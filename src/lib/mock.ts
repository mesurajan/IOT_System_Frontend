import type {
  AlertItem, AlertSeverity, AuditEntry, LogItem, ModelInfo,
  ProtocolDistributionItem, Stats, SystemHealth, TrendPoint,
} from "./types";

const PROTOCOLS = ["TCP", "UDP", "MQTT", "CoAP", "HTTP", "HTTPS", "ICMP"];
const SEVERITIES: AlertSeverity[] = ["low", "medium", "high", "critical"];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function ip() {
  return `${Math.floor(rand(10, 250))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(0, 255))}.${Math.floor(rand(1, 254))}`;
}

let monitoring = true;

export function mockStats(): Stats {
  const total = Math.floor(rand(180000, 240000));
  const anomalies = Math.floor(total * rand(0.012, 0.035));
  return {
    totalTraffic: total,
    normalTraffic: total - anomalies,
    anomalies,
    activeAlerts: Math.floor(rand(4, 22)),
    modelAccuracy: 0.94 + Math.random() * 0.045,
    latencyMs: Math.floor(rand(28, 88)),
    monitoring,
  };
}

export function mockAlerts(limit = 50): AlertItem[] {
  const now = Date.now();
  return Array.from({ length: limit }, (_, i) => ({
    id: `alert-${now}-${i}`,
    timestamp: new Date(now - i * 1000 * Math.floor(rand(20, 600))).toISOString(),
    severity: pick(SEVERITIES),
    protocol: pick(PROTOCOLS),
    sourceIp: ip(),
    destinationIp: ip(),
    description: pick([
      "Unusual port scanning pattern detected",
      "MQTT broker connection flood",
      "Suspicious payload entropy",
      "Anomalous outbound traffic to unknown host",
      "Repeated failed authentication attempts",
      "DNS tunneling indicators",
      "Beaconing behavior to external endpoint",
    ]),
    status: pick(["open", "open", "open", "acknowledged"]),
  }));
}

export function mockLogs(limit = 50): LogItem[] {
  const now = Date.now();
  return Array.from({ length: limit }, (_, i) => {
    const isAnomaly = Math.random() < 0.07;
    return {
      id: `log-${now}-${i}`,
      timestamp: new Date(now - i * 1000 * Math.floor(rand(2, 60))).toISOString(),
      protocol: pick(PROTOCOLS),
      sourceIp: ip(),
      destinationIp: ip(),
      bytes: Math.floor(rand(64, 18000)),
      packets: Math.floor(rand(1, 220)),
      classification: isAnomaly ? "anomaly" : "normal",
      score: isAnomaly ? rand(0.7, 0.99) : rand(0.0, 0.3),
    };
  });
}

export function mockProtocolDistribution(): ProtocolDistributionItem[] {
  return PROTOCOLS.map(p => ({ protocol: p, count: Math.floor(rand(800, 18000)) }));
}

export function mockTrend(points = 24): TrendPoint[] {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = new Date(now - (points - i) * 60_000 * 30);
    return {
      time: t.toISOString(),
      normal: Math.floor(rand(2000, 6000)),
      anomaly: Math.floor(rand(20, 220)),
    };
  });
}

export function mockCurrentModel(): ModelInfo {
  return {
    version: "v3.4.1",
    trainedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    validationScore: 0.967,
    status: "production",
    algorithm: "Hybrid CNN-LSTM",
    datasetName: "iot-traffic-2025-q2",
  };
}

export function mockModelHistory(): ModelInfo[] {
  const algos = ["Hybrid CNN-LSTM", "Random Forest", "XGBoost", "Autoencoder"];
  return Array.from({ length: 8 }, (_, i) => ({
    version: `v3.${4 - Math.floor(i / 3)}.${(8 - i)}`,
    trainedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    validationScore: 0.9 + Math.random() * 0.07,
    status: i === 0 ? "production" : i < 3 ? "candidate" : "archived",
    algorithm: pick(algos),
    datasetName: `iot-traffic-2025-q${(i % 4) + 1}`,
  }));
}

export function mockAudit(): AuditEntry[] {
  const actions = [
    "monitoring.start", "monitoring.stop", "model.retrain", "model.promote",
    "dataset.upload", "settings.update", "alert.acknowledge", "user.login",
  ];
  return Array.from({ length: 24 }, (_, i) => ({
    id: `audit-${i}`,
    timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
    actor: pick(["admin", "analyst.jane", "admin.ops"]),
    action: pick(actions),
    target: pick(["model:v3.4.1", "alert:8821", "dataset:q2", undefined as any]),
    outcome: Math.random() < 0.92 ? "success" : "failure",
  }));
}

export function mockHealth(): SystemHealth {
  return {
    api: "up",
    ingest: Math.random() < 0.95 ? "up" : "degraded",
    modelService: "up",
    kibana: Math.random() < 0.92 ? "up" : "degraded",
    cpuPct: Math.floor(rand(22, 68)),
    memPct: Math.floor(rand(38, 76)),
    uptimeSec: 86400 * 12 + Math.floor(rand(0, 86400)),
  };
}

export function setMockMonitoring(v: boolean) { monitoring = v; }
export function getMockMonitoring() { return monitoring; }
