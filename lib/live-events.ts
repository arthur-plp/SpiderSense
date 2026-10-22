"use client";

// One EventSource per tab on /api/events/stream, shared by every component
// that wants to know when the journal changes.

export type LiveChange = {
  sequence: number;
  type: string;
  aggregateType: "incident" | "hero";
  aggregateId: string;
  occurredAt: string;
  source: "online" | "offline" | "seed" | "load" | "migration";
};

type Listener = (change: LiveChange) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<(connected: boolean) => void>();
let source: EventSource | null = null;
let connected = false;

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  for (const listener of statusListeners) listener(value);
}

function open() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/events/stream");
  source.addEventListener("ready", () => setConnected(true));
  source.addEventListener("change", (message) => {
    const change = JSON.parse((message as MessageEvent<string>).data) as LiveChange;
    for (const listener of listeners) listener(change);
  });
  // EventSource reconnects by itself; meanwhile, the pages fall back to polling.
  source.addEventListener("error", () => setConnected(false));
}

function closeIfUnused() {
  if (listeners.size > 0 || statusListeners.size > 0 || !source) return;
  source.close();
  source = null;
  setConnected(false);
}

/** Calls `listener` for every change of the journal, until the returned function is called. */
export function subscribeLive(listener: Listener): () => void {
  listeners.add(listener);
  open();
  return () => {
    listeners.delete(listener);
    closeIfUnused();
  };
}

/** Follows the state of the live connection. */
export function subscribeLiveStatus(listener: (connected: boolean) => void): () => void {
  statusListeners.add(listener);
  listener(connected);
  open();
  return () => {
    statusListeners.delete(listener);
    closeIfUnused();
  };
}
