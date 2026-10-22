import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Role } from "@/lib/labels";
import type { StoredEvent } from "./events/store";

/** What the event store needs to know about the request that caused a change. */
export type RequestContext = {
  requestId: string;
  /** Idempotency-Key header: the id of an action queued on the device. */
  idempotencyKey: string | null;
  /** The action was made offline and is replayed now (X-Offline-Replay header). */
  offline: boolean;
  /** When the action happened on the device (X-Client-Time header), if plausible. */
  clientTime: Date | null;
  /** Events appended during the request, shipped to the logs once committed. */
  events: StoredEvent[];
  /** Set by apiUser(), for the logs. */
  user?: { id: string; role: Role };
};

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(context: RequestContext, task: () => T): T => storage.run(context, task);

export const requestContext = (): RequestContext | undefined => storage.getStore();

const MAX_CLIENT_TIME_AGE_MS = 7 * 24 * 3600 * 1000;

/** Client clock of a replayed action: never in the future, at most a week old. */
export function parseClientTime(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  const now = Date.now();
  if (Number.isNaN(date.getTime()) || date.getTime() > now + 60_000 || date.getTime() < now - MAX_CLIENT_TIME_AGE_MS) return null;
  return date;
}

/** When the action really happened: the device clock for offline replays, else now. */
export const actionTime = (): Date => requestContext()?.clientTime ?? new Date();
