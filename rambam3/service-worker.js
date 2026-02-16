importScripts('./shared/changelog.js');

const SEFARIA_API = 'https://www.sefaria.org';
const LATEST_VERSION = Math.max(...Object.keys(CHANGELOG).map(Number));
let CACHE_NAME = `rambam3-v${LATEST_VERSION}`;

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './plan.js',
        './manifest.json',
        './shared/styles.css',
        './shared/rambam-books.js',
        './shared/rambam-intros.js',
        './shared/screenshot.js',
        './shared/api.js',
        './shared/core.js',
        './shared/shell.js',
        './shared/about.js',
        './shared/changelog.js',
        './assets/logo.png',
        './assets/icon-192.png',
        './assets/icon-512.png',
        './assets/celebration-bg.png'
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

// ============================================================================
// Periodic Background Sync for Daily Reminders
// ============================================================================

// Register periodic sync when requested by the page
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'REGISTER_DAILY_SYNC') {
    try {
      // Periodic Background Sync (Chrome/Edge only)
      // Minimum interval is 12 hours, we'll check daily (24 hours)
      await self.registration.periodicSync.register('daily-study-check', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      });
      console.log('Periodic sync registered for daily study reminders');
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      console.error('Periodic sync registration failed:', error);
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  } else if (event.data && event.data.type === 'UNREGISTER_DAILY_SYNC') {
    try {
      await self.registration.periodicSync.unregister('daily-study-check');
      console.log('Periodic sync unregistered');
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      console.error('Periodic sync unregistration failed:', error);
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  }
});

// Handle periodic sync event
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-study-check') {
    event.waitUntil(checkAndNotifyDailyStudy());
  }
});

// Get transition settings from IndexedDB
async function getTransitionSettings() {
  return new Promise((resolve) => {
    const request = indexedDB.open('RambamSettings', 1);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      // Return defaults
      resolve({ mode: 'time', hour: 18, minute: 0 });
    };

    request.onsuccess = () => {
      const db = request.result;

      // Check if object store exists
      if (!db.objectStoreNames.contains('settings')) {
        db.close();
        resolve({ mode: 'time', hour: 18, minute: 0 });
        return;
      }

      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get('dayTransition');

      getRequest.onsuccess = () => {
        db.close();
        const data = getRequest.result;
        if (data) {
          resolve({ mode: data.mode, hour: data.hour, minute: data.minute });
        } else {
          // No settings stored, use defaults
          resolve({ mode: 'time', hour: 18, minute: 0 });
        }
      };

      getRequest.onerror = () => {
        db.close();
        resolve({ mode: 'time', hour: 18, minute: 0 });
      };
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// Check if it's time to study and show notification
async function checkAndNotifyDailyStudy() {
  try {
    // Get user's configured transition time from IndexedDB
    const settings = await getTransitionSettings();
    console.log('Transition settings from IndexedDB:', settings);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Show notification if we're within the transition hour
    // Example: if transition is 18:30, show notification between 18:00-18:59
    // This gives a 1-hour window since we can't control exact sync timing
    if (currentHour === settings.hour) {
      console.log('Time to study! Showing notification...');
      await self.registration.showNotification('יום חדש בלימוד!', {
        body: 'הגיע הזמן ללימוד היומי של רמב"ם',
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        tag: 'daily-study',
        requireInteraction: false,
        data: { type: 'daily-reminder', transitionTime: `${settings.hour}:${settings.minute}` },
        actions: [
          { action: 'open', title: 'פתח את האפליקציה' }
        ]
      });
    } else {
      console.log(`Not time yet. Current: ${currentHour}:${currentMinute}, Transition: ${settings.hour}:${settings.minute}`);
    }
  } catch (error) {
    console.error('Failed to check/notify for daily study:', error);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'update') {
    // User clicked "Update Now" - trigger update
    event.waitUntil(
      self.skipWaiting().then(() => {
        return clients.matchAll({ type: 'window' }).then(clientList => {
          clientList.forEach(client => client.postMessage({ type: 'RELOAD' }));
        });
      })
    );
  } else if (event.action === 'open' || !event.action) {
    // User clicked notification or "Open App" - focus/open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
  // 'dismiss' action or no action - just close the notification (already done above)
});
