/* ═══════════════════════════════════════════════════════════════
   sw.js — offline cache.

   Everything is precached, games included: the whole shelf is a few
   dozen kilobytes, so a tablet in aeroplane mode gets every game,
   not just the ones it happened to open.

   Bump CACHE whenever you change a file, or installed tablets will
   keep serving the version they already have.
   ═══════════════════════════════════════════════════════════════ */

const CACHE = 'khel-v1';

const ASSETS = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',

  'js/shell.js',
  'js/catalog.js',
  'js/audio.js',
  'js/toast.js',

  'games/ludo/index.js',
  'games/ludo/game.js',
  'games/ludo/rules.js',
  'games/ludo/render.js',
  'games/ludo/config.js',
  'games/ludo/ai.js',
  'games/ludo/ludo.css',

  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
