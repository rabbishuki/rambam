# Offline-First & Local-First Reference

Reference materials for building a truly offline-capable PWA.

---

## Source 1: 2Brew PWA

**URL:** https://2brew.github.io/
**GitHub:** https://github.com/2brew/2brew.github.io

A simple coffee brewing timer PWA that works fully offline. Good example of a minimal, effective offline-first implementation.

### What It Does Well

1. **Pre-caches all assets on install** - App works immediately offline after first visit
2. **Stores recipe data as static JSON** - No API dependency
3. **Cache-first strategy** - Instant loading, even on slow networks
4. **Minimal manifest** - Clean PWA install experience

### Service Worker Pattern (Cache-First)

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

// Install: Pre-cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first, then network
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(self.location.origin) && self.location.hostname !== 'localhost') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;  // Return cached version immediately
        }

        // Not in cache - fetch and cache for next time
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

### Key Takeaways for Rambam App

| 2Brew Pattern | Rambam Application |
|---------------|-------------------|
| Static JSON recipes | Pre-fetch week's halakhot as JSON in localStorage/IndexedDB |
| Pre-cache on install | Cache app shell + last week's content on install |
| Cache-first fetch | Serve cached halakhot instantly, update in background |
| Version in cache name | `rambam-v{VERSION}` for cache invalidation |
| Skip waiting | Immediately activate new SW for updates |

---

## Source 2: Local-First Software (Ink & Switch)

**Essay:** https://www.inkandswitch.com/local-first/
**PDF:** https://www.inkandswitch.com/local-first/static/local-first.pdf
**Authors:** Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan

A foundational essay on building software where users own their data. Published 2019, still highly relevant.

### The 7 Ideals of Local-First Software

| # | Ideal | Description | Rambam Relevance |
|---|-------|-------------|------------------|
| 1 | **Fast** | Instant response, no network latency | Load halakhot from local storage immediately |
| 2 | **Multi-Device** | Data syncs across devices | Future: Cloudflare KV sync with user code |
| 3 | **Offline** | Full read/write without network | Core requirement - study anywhere |
| 4 | **Collaboration** | Real-time multi-user editing | Not needed (single-user app) |
| 5 | **Longevity** | Data survives the app/company | Export to JSON, open format |
| 6 | **Privacy** | End-to-end encryption | Data stays on device by default |
| 7 | **User Control** | No vendor lock-in | No account required, exportable data |

### Key Principles

**1. The Cloud is a Backup, Not the Source of Truth**
```
Traditional:  Client ←→ Server (source of truth) ←→ Database
Local-first:  Local DB (source of truth) ←→ Sync layer ←→ Other devices
```

**2. Optimistic UI by Default**
- User action → immediate local state update → UI reflects change
- Sync happens in background, conflicts resolved later
- Never block UI on network

**3. Conflict Resolution with CRDTs**
- Conflict-free Replicated Data Types
- Multiple devices can edit simultaneously
- Automatic merge without conflicts
- For Rambam: Completion timestamps are idempotent (last-write-wins is fine)

**4. Data Ownership**
- User can export all their data
- App works without any account
- No "phone home" requirements

### Recommended Technologies

| Technology | Use Case | Notes |
|------------|----------|-------|
| **CRDTs** | Multi-device sync | Automerge, Yjs libraries |
| **IndexedDB** | Large local storage | Better than localStorage for structured data |
| **Service Workers** | Offline capability | Cache-first strategies |
| **WebRTC** | P2P sync | Direct device-to-device, no server |
| **SQLite (WASM)** | Local database | sql.js, wa-sqlite |

### Implementation Spectrum

```
Fully Cloud          Hybrid              Fully Local-First
     |                  |                       |
Google Docs      Notion/Obsidian          Actual CRDTs
     ↓                  ↓                       ↓
Server = truth   Server + local cache   Local = truth
     ↓                  ↓                       ↓
Offline = broken  Offline = read-only   Offline = full app
```

**Rambam Target: Hybrid → Local-First**
- Primary: Fully functional offline with local data
- Secondary: Optional sync via Cloudflare KV (future)

---

## Application to Rambam PWA

### Phase 1: Offline-Capable (Current Plan)

```
User opens app
    ↓
Service Worker intercepts
    ↓
[Cache hit?] ──Yes──→ Return cached halakhot instantly
    ↓ No                      ↓
Fetch from Sefaria      Show cached UI
    ↓                         ↓
Cache response          Background: check for updates
    ↓
Return to user
```

### Phase 2: True Local-First (Future)

```
┌─────────────────────────────────────────────┐
│                Local Device                  │
├─────────────────────────────────────────────┤
│  IndexedDB                                   │
│  ├── halakhot (prefetched week)             │
│  ├── completion (timestamps)                │
│  └── settings (user preferences)            │
│                                              │
│  Service Worker                              │
│  ├── Cache: app shell, static assets        │
│  └── Strategy: cache-first for all          │
└─────────────────────────────────────────────┘
                    ↕ (optional)
┌─────────────────────────────────────────────┐
│           Cloudflare KV (Sync)              │
│  ├── /sync/{user-code} → completion data    │
│  └── Merge strategy: last-write-wins        │
└─────────────────────────────────────────────┘
```

### Checklist for Local-First Rambam

**Immediate (Migration)**
- [ ] Pre-cache app shell on SW install
- [ ] Store prefetched halakhot in IndexedDB (not just localStorage)
- [ ] Cache-first strategy for all Sefaria content
- [ ] Instant UI response for all actions (no spinners)
- [ ] Work fully offline after first load + prefetch

**Future**
- [ ] Export/import JSON backup (longevity)
- [ ] Optional sync code for multi-device
- [ ] Background sync when online
- [ ] Conflict resolution for completion status

---

## Service Worker Strategy Comparison

| Strategy | When to Use | Rambam Use Case |
|----------|-------------|-----------------|
| **Cache-First** | Static assets, prefetched content | Halakha texts, app shell |
| **Network-First** | Fresh data needed | Calendar API (new dates) |
| **Stale-While-Revalidate** | Balance of speed + freshness | Hebrew dates, sunset times |
| **Network-Only** | Real-time required | Not needed |
| **Cache-Only** | Never changes | Icons, fonts |

### Recommended Rambam SW Config

```javascript
// Workbox-style config for next-pwa
runtimeCaching: [
  // App shell - cache only (versioned)
  {
    urlPattern: /\/_next\/static\/.*/,
    handler: 'CacheFirst',
    options: { cacheName: 'static-assets' }
  },

  // Halakha texts - cache first (prefetched)
  {
    urlPattern: /^https:\/\/www\.sefaria\.org\/api\/v3\/texts\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'sefaria-texts',
      expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } // 30 days
    }
  },

  // Calendar API - stale-while-revalidate
  {
    urlPattern: /^https:\/\/www\.sefaria\.org\/api\/calendars.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'sefaria-calendar',
      expiration: { maxAgeSeconds: 24 * 60 * 60 } // 1 day
    }
  },

  // Hebcal - stale-while-revalidate
  {
    urlPattern: /^https:\/\/www\.hebcal\.com\/.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'hebcal',
      expiration: { maxAgeSeconds: 24 * 60 * 60 }
    }
  }
]
```

---

---

## Source 3: Bangle.io

**URL:** https://bangle.io
**Privacy:** https://bangle.io/privacy

A local-first markdown note-taking app that offers two storage backends:
1. Browser storage (IndexedDB)
2. Local file system (File System Access API)

### Their Approach

```
User opens Bangle.io
    ↓
Choose workspace location:
    ├── "Browser Storage" → IndexedDB (works everywhere)
    └── "Local Folder" → File System Access API (limited support)
```

**Key insight:** They give users the choice, rather than forcing one approach.

---

## File System Access API: Should You Use It?

### Browser Support (as of 2025)

| Browser | Support | Notes |
|---------|---------|-------|
| **Chrome/Edge** | ✅ Full | Chromium-based, full support |
| **Safari** | ⚠️ Partial | Desktop Safari 15.2+, iOS Safari limited |
| **Firefox** | ❌ None | Explicitly declined to implement |
| **Mobile Chrome** | ❌ None | Not supported on Android |
| **PWA (iOS)** | ❌ None | Not available in home screen PWAs |

**Overall compatibility score: ~30%** of global users

### What It Enables

```javascript
// Open a file picker and get persistent access
const fileHandle = await window.showOpenFilePicker()
const file = await fileHandle.getFile()
const contents = await file.text()

// Write back to the same file (no "Save As" dialog)
const writable = await fileHandle.createWritable()
await writable.write(newContents)
await writable.close()

// Open a directory and access all files
const dirHandle = await window.showDirectoryPicker()
for await (const entry of dirHandle.values()) {
  console.log(entry.name)
}
```

### Fallback Library: browser-fs-access

[GoogleChromeLabs/browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) provides graceful fallbacks:

```javascript
import { fileOpen, fileSave, supported } from 'browser-fs-access'

// Feature detection
if (supported) {
  console.log('Native File System Access API available')
} else {
  console.log('Using fallback (<input type="file">)')
}

// Works everywhere, native where possible
const file = await fileOpen({
  mimeTypes: ['application/json'],
  extensions: ['.json'],
})

// Save (native = overwrites, fallback = downloads)
await fileSave(blob, {
  fileName: 'backup.json',
  extensions: ['.json'],
})
```

**Limitations of fallback:**
- Can't overwrite files (always "Save As" / download)
- Can't access directories
- No persistent file handles
- Different UX between browsers

---

## Better Alternative: Origin Private File System (OPFS)

OPFS is a **sandboxed file system** that works in ALL modern browsers, including Firefox and mobile.

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome 86+ | ✅ |
| Edge 86+ | ✅ |
| Firefox 111+ | ✅ |
| Safari 15.2+ | ✅ |
| iOS Safari 15.2+ | ✅ |
| Android Chrome | ✅ |

**Overall compatibility: ~95%** of modern browsers

### What It Is

```
Regular File System          OPFS
─────────────────────────    ─────────────────────────
User's Documents/            Browser's private storage/
├── myfile.txt               ├── {origin}/
├── photos/                  │   ├── file1
└── ...                      │   ├── file2
                             │   └── ...
User can see/access          Invisible to user
                             Only your app can access
```

### OPFS vs Other Storage

| Feature | localStorage | IndexedDB | OPFS |
|---------|-------------|-----------|------|
| **Capacity** | 5-10 MB | 50-500 MB | GB+ |
| **Speed** | Slow | Medium | Fast (2-10x) |
| **Async** | ❌ Sync only | ✅ | ✅ |
| **Binary data** | ❌ | ✅ | ✅ |
| **File-like API** | ❌ | ❌ | ✅ |
| **Web Worker** | ❌ | ✅ | ✅ (sync access!) |

### Basic OPFS Usage

```javascript
// Get the root directory
const root = await navigator.storage.getDirectory()

// Create/open a file
const fileHandle = await root.getFileHandle('halakhot.json', { create: true })

// Read
const file = await fileHandle.getFile()
const contents = await file.text()

// Write
const writable = await fileHandle.createWritable()
await writable.write(JSON.stringify(data))
await writable.close()

// Create directories
const dataDir = await root.getDirectoryHandle('prefetched', { create: true })
```

### High-Performance Sync Access (Web Worker)

```javascript
// In a Web Worker - synchronous file access!
const root = await navigator.storage.getDirectory()
const fileHandle = await root.getFileHandle('data.bin', { create: true })
const accessHandle = await fileHandle.createSyncAccessHandle()

// Synchronous read/write (very fast)
const buffer = new ArrayBuffer(1024)
accessHandle.read(buffer, { at: 0 })
accessHandle.write(buffer, { at: 0 })
accessHandle.flush()
accessHandle.close()
```

### Safari/iOS Considerations

**Important for PWAs:**
- Safari has a **7-day eviction policy** for script-writable storage
- BUT this **does not apply to installed PWAs** (added to home screen)
- PWAs have separate storage containers from Safari
- Storage quota varies (300MB - several GB depending on device)

```javascript
// Check available storage
const estimate = await navigator.storage.estimate()
console.log(`Used: ${estimate.usage} / ${estimate.quota} bytes`)

// Request persistent storage (prevents eviction)
const persistent = await navigator.storage.persist()
if (persistent) {
  console.log('Storage will not be evicted')
}
```

---

## Recommendation for Rambam

### Don't Use File System Access API

- Firefox users (10%+ of traffic) would be broken
- Mobile users would be broken
- Complex fallback handling
- Not worth the complexity for this use case

### Do Use OPFS + IndexedDB

```
Storage Strategy:
├── Settings, completion status → Zustand + localStorage (small, fast)
├── Day metadata, Hebrew dates → IndexedDB (structured queries)
└── Prefetched halakha texts → OPFS (large, fast binary access)
```

### Implementation Sketch

**src/lib/storage/opfs.ts:**
```typescript
const STORAGE_DIR = 'halakhot'

export async function saveHalakhot(date: string, data: DayData): Promise<void> {
  const root = await navigator.storage.getDirectory()
  const dir = await root.getDirectoryHandle(STORAGE_DIR, { create: true })
  const file = await dir.getFileHandle(`${date}.json`, { create: true })

  const writable = await file.createWritable()
  await writable.write(JSON.stringify(data))
  await writable.close()
}

export async function loadHalakhot(date: string): Promise<DayData | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const dir = await root.getDirectoryHandle(STORAGE_DIR)
    const file = await dir.getFileHandle(`${date}.json`)
    const blob = await file.getFile()
    return JSON.parse(await blob.text())
  } catch {
    return null // File doesn't exist
  }
}

export async function listPrefetchedDates(): Promise<string[]> {
  const root = await navigator.storage.getDirectory()
  try {
    const dir = await root.getDirectoryHandle(STORAGE_DIR)
    const dates: string[] = []
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        dates.push(entry.name.replace('.json', ''))
      }
    }
    return dates
  } catch {
    return []
  }
}
```

---

## Updated Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Rambam PWA                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Zustand Store (in-memory)                                 │
│   └── Hydrates from localStorage on load                    │
│                                                              │
│   localStorage (~5MB)                                        │
│   ├── rambam-storage (Zustand persist)                      │
│   │   ├── startDate, chaptersPerDay, autoMarkPrevious       │
│   │   └── completion map                                    │
│   └── rambam-location                                       │
│       └── coords, cityName, sunset                          │
│                                                              │
│   OPFS (GB+, fast)                                          │
│   └── halakhot/                                             │
│       ├── 2026-02-04.json  (prefetched day data + texts)    │
│       ├── 2026-02-05.json                                   │
│       └── ...                                               │
│                                                              │
│   Service Worker Cache                                       │
│   ├── static-assets (app shell)                             │
│   ├── sefaria-texts (API responses)                         │
│   └── hebcal (zmanim responses)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Additional Resources

- [Awesome PWA List](https://github.com/nicholasadamou/awesome-pwa) - Curated PWA examples
- [Workbox](https://developer.chrome.com/docs/workbox/) - Google's SW toolkit
- [Automerge](https://automerge.org/) - CRDT library for JS
- [PowerSync](https://www.powersync.com/) - Local-first sync service
- [Martin Kleppmann's talk](https://martin.kleppmann.com/2019/10/23/local-first-at-onward.html) - Video presentation
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) - OPFS documentation
- [web.dev: OPFS](https://web.dev/articles/origin-private-file-system) - OPFS guide
- [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) - File System Access polyfill
- [Kiwix PWA Case Study](https://web.dev/case-studies/kiwix) - Storing GBs offline

---

*Last updated: 2026-02-04*
