// Offline support. Shell assets are precached; anything else is cached on first use,
// including the meditation audio when it is played.

const CACHE = 'dhyan-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/router.js',
  './js/core/dates.js',
  './js/core/difficulty.js',
  './js/core/feedback.js',
  './js/core/icons.js',
  './js/core/random.js',
  './js/core/scoring.js',
  './js/core/ui.js',
  './js/data/meditation.js',
  './js/data/sudoku-puzzles.js',
  './js/data/zip-campaign.js',
  './js/games/meta.js',
  './js/games/memory.js',
  './js/games/stroop.js',
  './js/games/math.js',
  './js/games/sequence.js',
  './js/games/sudoku.js',
  './js/games/zip/zip.js',
  './js/games/zip/logic.js',
  './js/games/zip/generator.js',
  './js/games/zip/generator-worker.js',
  './js/games/zip/boards.js',
  './js/games/zip/puzzles.js',
  './js/screens/home.js',
  './js/screens/focus.js',
  './js/screens/meditation.js',
  './js/screens/habits.js',
  './js/screens/progress.js',
  './js/screens/settings.js',
  './js/state/store.js',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Media never changes and is large, so it is served from cache first.
const MEDIA = /\.(mp3|png|jpg|jpeg|webp|svg)$/i;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  if (MEDIA.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          // Skip partial (206) and error responses so cached media never corrupts.
          if (response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      }),
    );
    return;
  }

  // Code and styles: always fresh when online, cached when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
