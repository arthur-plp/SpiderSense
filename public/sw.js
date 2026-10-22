// Service worker of Spider Sense (registered in production by components/ui/service-worker.tsx).
// - The citizen and hero apps open without network: pages, static files,
//   last known incidents / heroes and map tiles come from the caches.
// - Background Sync replays the actions queued offline (lib/offline/outbox.ts),
//   even if no tab is open (Chrome / Edge).

const VERSION = "spider-sense-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const DATA = `${VERSION}-data`;
const TILES = `${VERSION}-tiles`;
const OFFLINE_PAGE = "/hors-ligne";
const NETWORK_TIMEOUT_MS = 4000;
const MAX_TILES = 600;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(OFFLINE_PAGE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Network first, cache as fallback (and refreshed on every success).
 * `ignoreSearch`: any cached variant of the URL will do (data, RSC payloads),
 * never for documents, which must not get an RSC payload instead of HTML.
 */
async function networkFirst(request, cacheName, { fallback = null, ignoreSearch = false } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS)),
    ]);
    if (response.ok && response.type === "basic") cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) ?? (ignoreSearch ? await cache.match(request, { ignoreSearch: true }) : undefined);
    if (cached) return cached;
    if (fallback) return (await caches.match(fallback)) ?? Response.error();
    throw error;
  }
}

/** Cache first: files whose URL changes with their content. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

/** Map tiles: served from the cache, refreshed in the background, the cache kept bounded. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(TILES);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map((key) => cache.delete(key)));
      }
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // Mutations: queued by the page when offline.
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (/cartocdn\.com|openfreemap|maptiler/.test(url.hostname)) event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    // Last known data of the maps; the live feed (SSE) and the rest go straight to the network.
    if (/^\/api\/(incidents|heroes)$/.test(url.pathname) || url.pathname.startsWith("/api/avatars/")) {
      event.respondWith(networkFirst(request, DATA, { ignoreSearch: true }));
    }
    return;
  }
  const appPage = url.pathname.startsWith("/citoyen") || url.pathname.startsWith("/heros");
  if (request.mode === "navigate") {
    // Only the citizen and hero apps are kept for offline use (not the moderation pages).
    event.respondWith(
      appPage
        ? networkFirst(request, PAGES, { fallback: OFFLINE_PAGE })
        : fetch(request).catch(async () => (await caches.match(OFFLINE_PAGE)) ?? Response.error()),
    );
    return;
  }
  // React Server Component payloads of client-side navigations.
  if (appPage && (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc"))) {
    event.respondWith(networkFirst(request, PAGES, { ignoreSearch: true }));
  }
});

// --- Background Sync: replay the outbox (same IndexedDB store as lib/offline/outbox.ts) ---------

function openOutbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("spider-sense", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("outbox", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function outboxRequest(database, mode, run) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("outbox", mode);
    const request = run(transaction.objectStore("outbox"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function replayOutbox() {
  const database = await openOutbox();
  const queue = (await outboxRequest(database, "readonly", (store) => store.getAll())).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const synced = [];
  const rejected = [];
  let pending = 0;
  for (const [index, action] of queue.entries()) {
    let response;
    try {
      response = await fetch(action.path, {
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
    } catch {
      pending = queue.length - index;
      break;
    }
    if (response.status >= 500 || (response.status === 409 && response.headers.get("retry-after"))) {
      pending = queue.length - index;
      break;
    }
    await outboxRequest(database, "readwrite", (store) => store.delete(action.id));
    if (response.ok) synced.push(action.label);
    else rejected.push({ label: action.label, error: (await response.json().catch(() => ({}))).error ?? `Refusé (${response.status})` });
  }
  database.close();
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage({ type: "outbox-synced", synced, rejected, pending });
  // Still something to send: the browser will fire "sync" again later.
  if (pending > 0) throw new Error("outbox not empty");
}

self.addEventListener("sync", (event) => {
  if (event.tag === "spidersense-outbox") event.waitUntil(replayOutbox());
});
