// Browser only (IndexedDB), loaded on demand by lib/api-client.ts.
// Actions made without network (SOS alert, report, intervention…) wait in
// IndexedDB, then are replayed in order when the connection comes back.
// Each action keeps the idempotency key it got when it was made: a replay
// that reaches the server twice is applied once (see route() in lib/server/api.ts).
// public/sw.js reads the same store for Background Sync.

export type QueuedAction = {
  /** Idempotency-Key of the request. */
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  /** What the user did, for the banner ("Alerte SOS : Vol"). */
  label: string;
  /** When the user did it: sent as X-Client-Time. */
  createdAt: string;
  attempts: number;
};

export type SyncReport = {
  synced: QueuedAction[];
  /** Refused by the server (e.g. incident taken in the meantime by another hero). */
  rejected: { action: QueuedAction; error: string }[];
  /** Still waiting (no network, or server error). */
  pending: number;
};

const DB_NAME = "spider-sense";
const STORE = "outbox";
export const OUTBOX_EVENT = "spidersense:outbox";
const SYNC_TAG = "spidersense-outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function listQueued(): Promise<QueuedAction[]> {
  if (typeof indexedDB === "undefined") return [];
  const all = await withStore("readonly", (store) => store.getAll() as IDBRequest<QueuedAction[]>);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const announce = (detail: { pending: number; report?: SyncReport }) =>
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail }));

export async function enqueue(action: Omit<QueuedAction, "attempts">): Promise<void> {
  await withStore("readwrite", (store) => store.put({ ...action, attempts: 0 }));
  announce({ pending: (await listQueued()).length });
  // Chrome / Edge: the service worker replays the queue even if the tab is closed.
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  await (registration as (ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }) | undefined)?.sync
    ?.register(SYNC_TAG)
    .catch(() => undefined);
}

const remove = (id: string) => withStore("readwrite", (store) => store.delete(id));

/** One request at a time, in the order the actions were made. */
function send(action: QueuedAction): Promise<Response> {
  return fetch(action.path, {
    method: action.method,
    credentials: "same-origin",
    headers: {
      "idempotency-key": action.id,
      "x-offline-replay": "1",
      "x-client-time": action.createdAt,
      ...(action.body ? { "content-type": "application/json" } : {}),
    },
    body: action.body ? JSON.stringify(action.body) : undefined,
  });
}

let flushing: Promise<SyncReport> | null = null;

/** Replays the queue. Stops at the first network failure (still offline) or server error. */
export function flushOutbox(): Promise<SyncReport> {
  flushing ??= (async () => {
    const report: SyncReport = { synced: [], rejected: [], pending: 0 };
    const queue = await listQueued();
    for (const [index, action] of queue.entries()) {
      let response: Response;
      try {
        response = await send(action);
      } catch {
        report.pending = queue.length - index;
        break;
      }
      // 409 "in progress": the first replay is still running; ask again later.
      if (response.status >= 500 || (response.status === 409 && response.headers.get("retry-after"))) {
        await withStore("readwrite", (store) => store.put({ ...action, attempts: action.attempts + 1 }));
        report.pending = queue.length - index;
        break;
      }
      await remove(action.id);
      if (response.ok) report.synced.push(action);
      else {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        report.rejected.push({ action, error: body.error ?? `Refusé (${response.status})` });
      }
    }
    announce({ pending: report.pending, report });
    return report;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
