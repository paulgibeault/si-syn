/* Si-Syn Service Worker — offline-first cache.
 *
 * CANONICAL FLEET SHAPE (tools/templates/game-sw.js in the launcher repo).
 * The structure here — version line, owned-prefix cleanup, scope-guarded
 * fetch, skip-waiting message — is meant to be identical across every arcade
 * app; only APP_VERSION, CACHE_PREFIX and the precache list differ.
 *
 * This file lives at the REPO ROOT (not public/) because fleet CI's
 * version-bump step rewrites the APP_VERSION line at ./sw.js before the
 * build; vite.config.js ships the rewritten file into the artifact root.
 *
 * The precache list is SHELL-ONLY, unlike the static apps': this app is
 * vite-bundled, so its module graph deploys under content-hashed names that
 * cannot be hand-listed. The fetch handler's runtime fill caches each hashed
 * asset on first use — after one online visit the whole build is cached, and
 * a new deploy's new hashes miss the old cache by construction. The eventual
 * fleet-wide fix is build-time precache injection (issue #39).
 */

// Written by fleet CI on every deploy (fleet-ci.yml, "Bump patch version").
// DO NOT EDIT BY HAND, and keep the line exactly as written — single quotes,
// no leading whitespace — or the deploy-time rewrite silently stops firing
// and every fix ships to nobody who has already visited.
const APP_VERSION = '0.1.1';

// Every cache this game will ever own starts with this prefix. Cleanup is
// filtered to it; see activate for why that is not optional.
const CACHE_PREFIX = 'si-syn-';
const CACHE_NAME = `${CACHE_PREFIX}v${APP_VERSION}`;

// Shell + unhashed public/ assets only — see the header for why the bundled
// module graph is runtime-filled instead of listed.
// tools/verify-artifact.mjs cross-checks every entry against the deploy.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon.png',
  './favicon.png',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './apple-touch-icon-152.png',
  './apple-touch-icon-167.png',
  './js/soundpack.js',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Deliberately NOT skipWaiting(). The new worker installs and waits; the
  // launcher spots it and offers the player an explicit "update ready" reload,
  // then sends the message below once they accept. Activating unannounced
  // would swap the cache under a running game, so anything fetched lazily
  // after the swap would come from a different build than the code asking.
});

self.addEventListener('message', event => {
  // Sent by the launcher's update control (menu → "Check for Updates", or the
  // automatic prompt) once the player accepts the reload.
  if (event.data && event.data.type === 'arcade:sw.skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          // ONLY our own caches. caches.keys() is ORIGIN-scoped and the whole
          // fleet shares paulgibeault.github.io, so a bare `k !== CACHE_NAME`
          // filter would delete the launcher's cache and every sibling
          // game's on each activation.
          .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Only requests within this game's own scope. Without this guard the
  // handler below caches EVERY request the page makes under our cache —
  // including launcher assets like /arcade-sdk.js, which then get served
  // stale from here indefinitely, and cross-origin responses we have no
  // business storing.
  if (!event.request.url.startsWith(self.registration.scope)) return;

  if (event.request.mode === 'navigate') {
    // Network-first for the HTML shell to prevent stale content
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache-first for static assets; cache successful fetches too — for this
  // bundled app that runtime fill IS the precache for the hashed module
  // graph (see header).
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
