import "server-only";

// Structured logs (Elastic Common Schema field names), shipped in batches to
// Logstash when LOGSTASH_URL is set (`docker compose --profile elk up -d`).
// LOG_FORMAT=json also prints them on stdout.

export type LogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  /** api.request, domain.event or app.error: one data view per kind in Kibana. */
  dataset: "api.request" | "domain.event" | "app.error";
  [field: string]: unknown;
};

type Shipper = { queue: Record<string, unknown>[]; timer?: ReturnType<typeof setTimeout>; failing?: boolean };

const globalForLogs = globalThis as unknown as { spiderSenseLogs?: Shipper };
const shipper: Shipper = (globalForLogs.spiderSenseLogs ??= { queue: [] });

const MAX_QUEUE = 5000;
const FLUSH_EVERY_MS = 1000;

async function flush() {
  shipper.timer = undefined;
  const url = process.env.LOGSTASH_URL;
  const batch = shipper.queue.splice(0, 500);
  if (!url || batch.length === 0) return;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (shipper.failing) console.info("[logs] Logstash joignable à nouveau");
    shipper.failing = false;
  } catch (error) {
    // Logs must never break the app: keep them for the next attempt (bounded).
    shipper.queue.unshift(...batch.slice(0, Math.max(0, MAX_QUEUE - shipper.queue.length)));
    if (!shipper.failing) console.warn(`[logs] Logstash injoignable (${url}) :`, error instanceof Error ? error.message : error);
    shipper.failing = true;
  }
  if (shipper.queue.length > 0) schedule();
}

function schedule() {
  shipper.timer ??= setTimeout(() => void flush(), shipper.failing ? 10_000 : FLUSH_EVERY_MS);
}

export function log({ level, message, dataset, ...fields }: LogEntry): void {
  const record = {
    "@timestamp": new Date().toISOString(),
    "log.level": level,
    message,
    "event.dataset": dataset,
    "service.name": "spider-sense",
    "service.environment": process.env.NODE_ENV ?? "development",
    ...fields,
  };
  if (process.env.LOG_FORMAT === "json") console.log(JSON.stringify(record));
  if (!process.env.LOGSTASH_URL) return;
  if (shipper.queue.length >= MAX_QUEUE) shipper.queue.shift();
  shipper.queue.push(record);
  schedule();
}
