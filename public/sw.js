// Bump this whenever the caching strategy changes. The activate handler deletes
// every cache that does not match, which is what evicts a poisoned older cache.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `pta-qms-${CACHE_VERSION}`;

// Only genuinely static, non-versioned files belong here.
//
// The app shell ('/' → index.html) is deliberately NOT precached. It names the
// content-hashed bundles for one specific build, so a cached copy outlives the
// deployment it belongs to: after the next deploy it asks for asset hashes that
// no longer exist, every request 404s, and the page dies on the loading spinner
// with no JavaScript running and no way to recover. HTML is always network-first.
const STATIC_ASSETS = [
  '/favicon.svg',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch cross-origin traffic or non-GET navigation side effects.
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // ── HTML navigations: network-first, always ────────────────────────────────
  // The freshest index.html is the only one whose asset hashes are guaranteed to
  // exist on the server. The cache is an offline fallback, never the first choice.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/offline-shell', clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/offline-shell');
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
            '<body style="font-family:system-ui;background:#0b1523;color:#94a3b8;display:flex;min-height:100vh;align-items:center;justify-content:center">' +
            '<p>You are offline. Reconnect and reload to continue.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // ── API calls: network-first, fall back to cache ───────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful GET responses
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed — check if it's a mutation that should be queued
          if (request.method !== 'GET') {
            // Store failed mutations in IndexedDB for offline queue
            try {
              const body = await request.clone().text();
              await storeOfflineMutation(request.method, request.url, body, Object.fromEntries(request.headers.entries()));
            } catch {
              // silently fail queue storage
            }
            return new Response(
              JSON.stringify({ message: 'Queued for offline sync', offline: true }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // GET: try cache
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ message: 'Offline and no cached data' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  if (request.method !== 'GET') return;

  // ── Content-hashed build output: cache-first is safe ───────────────────────
  // Filenames under /assets/ contain a content hash, so a cached entry can never
  // be stale — a changed file gets a new name. A 404 here is never served from
  // cache, so the page-level watchdog still sees the real failure and recovers.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Everything else static: stale-while-revalidate ────────────────────────
  // Unhashed files (locales, icons) serve instantly from cache but refresh in the
  // background, so a change is picked up on the next load instead of never.
  const isCacheable = /\.(?:js|css|svg|png|woff2|json)$/.test(url.pathname);
  if (!isCacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));

      return cached || network;
    })
  );
});

// IndexedDB helpers for offline mutation queue
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pta-qms-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeOfflineMutation(method, url, body, headers) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    store.add({ method, url, body, headers, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Listen for online events to replay queue
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REPLAY_QUEUE') {
    replayOfflineQueue().then((count) => {
      event.ports[0].postMessage({ replayed: count });
    });
  }
});

async function replayOfflineQueue() {
  const db = await openOfflineDB();
  return new Promise((resolve) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    const getAll = store.getAll();
    getAll.onsuccess = async () => {
      const mutations = getAll.result;
      let replayed = 0;
      for (const mutation of mutations) {
        try {
          const response = await fetch(mutation.url, {
            method: mutation.method,
            headers: mutation.headers,
            body: mutation.body || undefined,
          });
          if (response.ok) {
            // Remove from queue
            const deleteTx = db.transaction('mutations', 'readwrite');
            deleteTx.objectStore('mutations').delete(mutation.id);
            replayed++;
          }
        } catch {
          // Still offline, stop retrying
          break;
        }
      }
      resolve(replayed);
    };
    getAll.onerror = () => resolve(0);
  });
}
