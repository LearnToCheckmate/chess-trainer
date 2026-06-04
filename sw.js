// Chess Trainer service worker
// app code (app.js, index.html, navigations): NETWORK-FIRST so updates land immediately when online.
// static assets (icons, wasm, manifest): cache-first (fast, and the 7MB engine isn't re-downloaded).
// IMPORTANT: only same-origin GETs are handled. Cross-origin requests (Firestore realtime,
// Firebase SDK on gstatic, Lichess/Chess.com APIs) pass straight to the network untouched —
// intercepting them breaks Firestore's live connection and forces slow polling.
const CACHE = 'chess-trainer-v3';
const ASSETS = ['./','./index.html','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only ever touch our own origin. Everything else (Firebase, Firestore, Lichess, Chess.com) → network.
  if (url.origin !== self.location.origin) return;
  const fresh = e.request.mode === 'navigate'
    || url.pathname.endsWith('/app.js')
    || url.pathname.endsWith('/index.html')
    || url.pathname.endsWith('/');
  if (fresh) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }))
    );
  }
});
