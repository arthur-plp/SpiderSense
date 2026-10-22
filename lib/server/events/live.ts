import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import type { EventSummary } from "./store";

// Live feed of the journal for the Server-Sent Events route. With PostgreSQL,
// one LISTEN connection per server receives the NOTIFY sent by every writer
// (this server, other instances, scripts). With PGlite (single process), the
// event store publishes in memory.

type Live = { bus: EventEmitter; client?: Promise<Client> };

const globalForLive = globalThis as unknown as { spiderSenseLive?: Live };
const live: Live = (globalForLive.spiderSenseLive ??= { bus: new EventEmitter().setMaxListeners(0) });

const CHANNEL = "domain_events";

export function publishLocally(summary: EventSummary): void {
  if (!process.env.DATABASE_URL) live.bus.emit("event", summary);
}

function listen(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const reconnect = () => {
    live.client = undefined;
    client.removeAllListeners();
    client.end().catch(() => undefined);
    // Back as soon as someone is still watching.
    setTimeout(() => {
      if (live.bus.listenerCount("event") > 0) void ensureListening();
    }, 2000);
  };
  client.on("notification", (message) => {
    if (!message.payload) return;
    try {
      live.bus.emit("event", JSON.parse(message.payload) as EventSummary);
    } catch {
      // Not ours: ignore.
    }
  });
  client.on("error", reconnect);
  client.on("end", reconnect);
  return client
    .connect()
    .then(() => client.query(`LISTEN ${CHANNEL}`))
    .then(() => client)
    .catch((error: unknown) => {
      reconnect();
      throw error;
    });
}

function ensureListening() {
  if (!process.env.DATABASE_URL) return;
  live.client ??= listen();
  live.client.catch((error: unknown) => console.error("[live] LISTEN impossible", error));
}

/** Calls `listener` for every event appended to the journal, until the returned function is called. */
export function subscribe(listener: (summary: EventSummary) => void): () => void {
  ensureListening();
  live.bus.on("event", listener);
  return () => live.bus.off("event", listener);
}
