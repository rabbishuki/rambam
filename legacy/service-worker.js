const SEFARIA_API = 'https://www.sefaria.org';
let CACHE_NAME = 'rambam-v2'; // Will be updated dynamically

// Get the latest version from changelog.js
async function getLatestVersion() {
  try {
    const response = await fetch('./changelog.js');
    const text = await response.text();
    // Extract version keys from CHANGELOG object
    const matches = text.match(/const CHANGELOG = \{([^}]+)}/s);
    if (matches) {
      const content = matches[1];
      // Match quoted strings and numbers as keys (e.g., "2.1", 1, 0)
      const versionMatches = content.match(/["']?(\d+(?:\.\d+)?)["']?\s*:/g);
      if (versionMatches) {
        const versions = versionMatches.map(m => {
          const v = m.match(/(\d+(?:\.\d+)?)/)[1];
          return parseFloat(v);
        });
        const latestVersion = Math.max(...versions);
        // Convert back to string to preserve decimal format
        return latestVersion.toString().replace('.', '_');
      }
    }
  } catch (error) {
    console.error('Failed to get version from changelog:', error);
  }
  return '2_1'; // fallback version
}

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    getLatestVersion().then((version) => {
      CACHE_NAME = `rambam-v${version}`;
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          './',
          './index.html',
          './changelog.js',
          './logo.png',
          './icon-192.png',
          './icon-512.png',
          './manifest.json'
        ]);
      });
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
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets: cache-first
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
