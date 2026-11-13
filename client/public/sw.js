// Minimal service worker: it exists only so Chrome offers "Install app".
// It deliberately caches nothing — the app is useless offline, and a cache
// would risk serving a stale bundle or stale API data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // No respondWith(): the browser handles every request normally.
});
