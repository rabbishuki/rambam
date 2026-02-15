importScripts('./changelog.js');

const SEFARIA_API = 'https://www.sefaria.org';
const LATEST_VERSION = Math.max(...Object.keys(CHANGELOG).map(Number));
let CACHE_NAME = `rambam-v${LATEST_VERSION}`;

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './changelog.js',
        './assets/logo.png',
        './assets/icon-192.png',
        './assets/icon-512.png',
        './manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https requests (skip chrome-extension, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Sefaria API: network-first (with cache fallback)
  if (url.origin === SEFARIA_API) {
    // Add query parameters to Sefaria requests
    url.searchParams.set('vhe', 'hebrew|Torat_Emet_363');
    url.searchParams.set('lang', 'he');

    // Create a new request with the modified URL
    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      mode: request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      integrity: request.integrity
    });

    event.respondWith(
      fetch(modifiedRequest)
        .then((response) => {
          // Cache successful API responses (only GET requests)
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(modifiedRequest, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(modifiedRequest);
        })
    );
    return;
  }

  // Static assets: cache-first (only GET requests)
  if (request.method !== 'GET') {
    // Don't cache non-GET requests (POST, PUT, DELETE, etc.)
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Cache new resources
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
