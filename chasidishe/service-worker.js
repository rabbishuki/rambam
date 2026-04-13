importScripts('./shared/changelog.js');

const SEFARIA_API = 'https://www.sefaria.org';
const LATEST_VERSION = Math.max(...Object.keys(CHANGELOG).map(Number));
const CACHE_NAME = `chasidus-v${LATEST_VERSION}`;

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './plan.js',
        './schedule.js',
        './manifest.json',
        './shared/styles.css',
        './shared/rambam-books.js',
        './shared/screenshot.js',
        './shared/api.js',
        './shared/core.js',
        './shared/shell.js',
        './shared/about.js',
        './shared/changelog.js',
        './assets/logo.png',
        './assets/icon-192.png',
        './assets/icon-512.png',
        './assets/celebration-bg.png',
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
        cacheNames
          .filter((name) => name.startsWith('chasidus-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for Sefaria API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // Sefaria API: network-first with cache fallback (offline support)
  if (url.origin === SEFARIA_API) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ─── Periodic Background Sync (daily reminders) ───────────────────────────

self.addEventListener('message', async (event) => {
  if (event.data?.type === 'REGISTER_DAILY_SYNC') {
    try {
      await self.registration.periodicSync.register('daily-study-check', {
        minInterval: 24 * 60 * 60 * 1000,
      });
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  } else if (event.data?.type === 'UNREGISTER_DAILY_SYNC') {
    try {
      await self.registration.periodicSync.unregister('daily-study-check');
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-study-check') {
    event.waitUntil(checkAndNotify());
  }
});

async function getTransitionSettings() {
  return new Promise((resolve) => {
    const request = indexedDB.open('RambamSettings', 1);
    request.onerror = () => resolve({ mode: 'time', hour: 18, minute: 0 });
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.close();
        return resolve({ mode: 'time', hour: 18, minute: 0 });
      }
      const tx = db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const get = store.get('dayTransition');
      get.onsuccess = () => {
        db.close();
        const d = get.result;
        resolve(d ? { mode: d.mode, hour: d.hour, minute: d.minute } : { mode: 'time', hour: 18, minute: 0 });
      };
      get.onerror = () => { db.close(); resolve({ mode: 'time', hour: 18, minute: 0 }); };
    };
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function checkAndNotify() {
  try {
    const settings = await getTransitionSettings();
    const now = new Date();
    if (now.getHours() === settings.hour) {
      await self.registration.showNotification('יום חדש בלימוד!', {
        body: 'הגיע הזמן ללימוד תורה אור ולקוטי תורה',
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        tag: 'daily-study',
        requireInteraction: false,
        data: { type: 'daily-reminder' },
        actions: [{ action: 'open', title: 'פתח את האפליקציה' }],
      });
    }
  } catch (err) {
    console.error('checkAndNotify failed:', err);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
    );
  }
});
