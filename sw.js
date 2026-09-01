/* ═══════════════════════════════════════════════════════════════
   sw.js — offline cache.

   Everything is precached, games included: the whole shelf is a few
   dozen kilobytes, so a tablet in aeroplane mode gets every game,
   not just the ones it happened to open.

   Bump CACHE whenever you change a file, or installed tablets will
   keep serving the version they already have.
   ═══════════════════════════════════════════════════════════════ */

const CACHE = 'khel-v5';

const ASSETS = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',

  'js/shell.js',
  'js/catalog.js',
  'js/audio.js',
  'js/toast.js',
  'js/table.js',
  'js/family.js',
  'js/pawn.js',
  'js/dice.js',
  'js/confetti.js',

  'games/ludo/index.js',
  'games/ludo/game.js',
  'games/ludo/rules.js',
  'games/ludo/render.js',
  'games/ludo/config.js',
  'games/ludo/ai.js',
  'games/ludo/ludo.css',

  'games/snakes/index.js',
  'games/snakes/game.js',
  'games/snakes/rules.js',
  'games/snakes/render.js',
  'games/snakes/config.js',
  'games/snakes/snakes.css',

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
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  // Opening the page goes to the network first, so a fresh deploy shows up
  // straight away instead of a week later. The cache is the fallback, which
  // is what makes it work on a tablet in aeroplane mode.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Everything else is served from the cache for speed, and quietly
  // refreshed in the background for next time.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const fromNetwork = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fromNetwork;
    })
  );
});
