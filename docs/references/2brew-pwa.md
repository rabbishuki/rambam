# 2Brew PWA Reference

**Source:** https://2brew.github.io/
**GitHub:** https://github.com/2brew/2brew.github.io

A coffee brewing timer PWA that works fully offline. Simple, effective implementation.

---

## Overview

2Brew is a minimal PWA for coffee brewing timers. It demonstrates a clean offline-first pattern that we can learn from.

### Key Characteristics

- Single-page Svelte app
- All recipes stored as static JSON files
- Pre-caches everything on install
- Works 100% offline after first visit
- No server dependencies

---

## Service Worker Pattern

### Cache Strategy: Pre-cache Everything

```javascript
const PRECACHE = 'cache-v3';
const RUNTIME = 'runtime-1';

// All assets needed for offline use
const PRECACHE_URLS = [
  'index.html',
  './',
  '/public/favicon.png',
  '/public/aeropress.json',    // Recipe data as static files
  '/public/moka.json',
  '/public/v_60.json',
  '/public/frenchPress.json',
  '/public/audio/end.wav',      // Even audio files cached
  '/public/audio/stage.wav',
  '/public/audio/tick.wav',
  '/public/build/bundle.css',
  '/public/build/bundle.js',
  '/public/global.css'
];
```

### Install Event: Pre-cache All Assets

```javascript
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())  // Activate immediately
  );
});
```

### Activate Event: Clean Old Caches

```javascript
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())  // Take control of all clients
  );
});
```

### Fetch Event: Cache-First Strategy

```javascript
self.addEventListener('fetch', event => {
  // Only handle same-origin requests, skip in development
  if (event.request.url.startsWith(self.location.origin) &&
      self.location.hostname !== 'localhost') {

    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached version immediately if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network and cache for next time
        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});
```

---

## PWA Manifest

```json
{
  "name": "2Brew",
  "short_name": "2Brew",
  "icons": [
    {
      "src": "public/icon/icon_128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "public/icon/icon_192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "public/icon/icon_512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9f9fa",
  "theme_color": "#f9f9fa"
}
```

---

## Key Lessons for Rambam

### 1. Store Data as Static Files

2Brew stores recipes as JSON files that get pre-cached:
```
/public/aeropress.json
/public/moka.json
/public/v_60.json
```

**Rambam equivalent:**
- Pre-fetch week's halakhot as JSON
- Store in OPFS or IndexedDB
- Treat cached content as "static" for offline use

### 2. Pre-cache on Install

Don't wait for user to visit pages - cache everything upfront:
```javascript
// Bad: Cache on demand
fetch → cache if miss → return

// Good: Cache on install
install → cache all → ready for offline
```

### 3. Skip Waiting + Claim Clients

Activate new service worker immediately:
```javascript
self.skipWaiting()        // Don't wait for old SW to die
self.clients.claim()      // Take over all open tabs
```

This ensures updates take effect without requiring page reload.

### 4. Version Cache Names

Use versioned cache names for easy invalidation:
```javascript
const PRECACHE = 'cache-v3';  // Increment to invalidate
```

Old caches are cleaned up on activation.

### 5. Separate Pre-cache from Runtime Cache

- **PRECACHE**: Known assets, loaded on install
- **RUNTIME**: Dynamic content, cached on first access

---

## Differences from Rambam

| Aspect | 2Brew | Rambam |
|--------|-------|--------|
| Data source | Static JSON files | External API (Sefaria) |
| Data size | Small (~100KB) | Larger (texts can be several MB) |
| Update frequency | Rarely | Daily (new dates) |
| User data | None | Completion tracking |

### Adaptations Needed

1. **Can't pre-cache all API data** - need progressive caching
2. **Need background update mechanism** - fetch new dates
3. **User data persistence** - localStorage/OPFS for completion status
4. **Stale-while-revalidate** for calendar data

---

## References

- [2Brew Live](https://2brew.github.io/)
- [2Brew GitHub](https://github.com/2brew/2brew.github.io)
- [Service Worker Source](https://github.com/2brew/2brew.github.io/blob/master/service-worker.js)
