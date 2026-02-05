/**
 * Service Worker for Daily Rambam PWA
 * Handles offline caching and background sync
 */

const CACHE_NAME = "rambam-v6";
const OFFLINE_URL = "/offline.html";

// Assets to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  // App images
  "/logo.png",
  "/contributors/meir.png",
  "/contributors/claude.jpeg",
  "/contributors/rabbi.jpeg",
];

// Cache strategies for different request types
const CACHE_STRATEGIES = {
  // Sefaria text API - CacheFirst (texts rarely change)
  sefariaTexts: {
    pattern: /^https:\/\/www\.sefaria\.org\/api\/v3\/texts\//i,
    strategy: "cache-first",
    cacheName: "sefaria-texts",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    maxEntries: 500,
  },
  // Sefaria calendar API - StaleWhileRevalidate
  sefariaCalendar: {
    pattern: /^https:\/\/www\.sefaria\.org\/api\/calendars/i,
    strategy: "stale-while-revalidate",
    cacheName: "sefaria-calendar",
    maxAge: 24 * 60 * 60, // 24 hours
    maxEntries: 100,
  },
  // Hebcal API - StaleWhileRevalidate
  hebcal: {
    pattern: /^https:\/\/www\.hebcal\.com\//i,
    strategy: "stale-while-revalidate",
    cacheName: "hebcal-api",
    maxAge: 24 * 60 * 60, // 24 hours
    maxEntries: 100,
  },
  // Static assets - CacheFirst
  staticAssets: {
    pattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
    strategy: "cache-first",
    cacheName: "static-assets",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 100,
  },
  // Next.js optimized images - CacheFirst
  nextImages: {
    pattern: /\/_next\/image\?/i,
    strategy: "cache-first",
    cacheName: "next-images",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 100,
  },
  // Next.js static assets
  nextStatic: {
    pattern: /\/_next\/static\//i,
    strategy: "cache-first",
    cacheName: "next-static",
    maxAge: 365 * 24 * 60 * 60, // 1 year (immutable)
    maxEntries: 200,
  },
  // App pages - NetworkFirst with offline fallback
  pages: {
    pattern: /^https?:\/\/[^/]+\/(he|en)?\/?$/i,
    strategy: "network-first",
    cacheName: "app-pages",
    maxAge: 24 * 60 * 60, // 24 hours
    maxEntries: 50,
  },
};

// Install event - precache essential assets
// Note: We do NOT call skipWaiting() here - we want the user to see the update banner
// and explicitly choose to refresh. skipWaiting() is called when user clicks "Refresh".
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Precaching assets...");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("[SW] Install complete, waiting for activation...");
      }),
  );
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old version caches but keep strategy-specific caches
            if (
              cacheName !== CACHE_NAME &&
              !Object.values(CACHE_STRATEGIES).some(
                (s) => s.cacheName === cacheName,
              )
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[SW] Activate complete");
        return self.clients.claim();
      }),
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Find matching cache strategy
  let matchedStrategy = null;
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.pattern.test(request.url)) {
      matchedStrategy = { name, ...config };
      break;
    }
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cache first, then offline page
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match(OFFLINE_URL);
          });
        }),
    );
    return;
  }

  // Apply matched strategy or use default
  if (matchedStrategy) {
    event.respondWith(handleWithStrategy(request, matchedStrategy));
  } else {
    // Default: try network, fall back to cache
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});

// Handle request with specified caching strategy
async function handleWithStrategy(request, strategy) {
  const cache = await caches.open(strategy.cacheName);

  switch (strategy.strategy) {
    case "cache-first": {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.log("[SW] Network failed for:", request.url);
        throw error;
      }
    }

    case "network-first": {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    }

    case "stale-while-revalidate": {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    }

    default:
      return fetch(request);
  }
}

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[SW] Service worker loaded");
