// Basic offline-shell service worker.
const CACHE = 'kst-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  // Girdiler tek tek eklenir: biri başarısız olursa kalanlar cache'lenmeye devam eder
  // (addAll hepsi-ya-da-hiçbiri davranır ve tek 404 tüm shell'i boş bırakır).
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
      )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Don't cache cross-origin (videos, map tiles, fonts) — go straight to network.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, cache fallback for offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/')).then((r) => r || fetch(req))
        )
    );
    return;
  }

  // Cache-first for same-origin static assets.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
