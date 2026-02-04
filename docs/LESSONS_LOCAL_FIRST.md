# Lessons Learned: Local-First Architecture

Key insights from studying local-first software patterns and how they apply to the Rambam PWA.

---

## Core Principle

> **"The network is optional, not required."**

The app should work perfectly offline. Network connectivity is an enhancement for sync, not a dependency for functionality.

---

## Lesson 1: Local is the Source of Truth

### Traditional Cloud Architecture

```
User Action → API Call → Server Validates → Database Write → Response → UI Update
                  ↓
              (Waiting...)
                  ↓
           "Loading spinner"
```

**Problems:**
- User waits for network
- Offline = broken app
- Server down = broken app

### Local-First Architecture

```
User Action → Local Write → UI Update (instant!)
                  ↓
           Background Sync (when online)
```

**Benefits:**
- Instant response
- Works offline
- Server optional

### Rambam Application

```typescript
// ❌ Bad: Wait for network
async function markComplete(id: string) {
  setLoading(true)
  await api.markComplete(id)  // Blocks on network!
  setLoading(false)
  updateUI()
}

// ✅ Good: Local first
function markComplete(id: string) {
  store.markComplete(id)      // Instant local update
  updateUI()                  // Instant UI feedback
  syncQueue.add({ markComplete: id })  // Background sync later
}
```

---

## Lesson 2: Optimistic UI is Not Optional

Every user action should produce immediate visual feedback. Never show a spinner for local operations.

### Rules

1. **< 100ms** for any UI response
2. **No spinners** for local data access
3. **Optimistic updates** - show the result immediately, fix later if needed

### Rambam Application

```typescript
// Swipe to complete
function onSwipeRight(halakhaId: string) {
  // 1. Immediate haptic feedback
  navigator.vibrate?.(10)

  // 2. Immediate visual feedback
  setCompleted(halakhaId, true)  // Local state
  animateCompletion()

  // 3. Immediate scroll to next
  scrollToNext()

  // 4. Background: persist to storage
  persistCompletion(halakhaId)  // Async, user doesn't wait
}
```

---

## Lesson 3: Progressive Enhancement for Sync

Build in layers:
1. **Layer 1:** Works completely offline (MVP)
2. **Layer 2:** Syncs when online (enhancement)
3. **Layer 3:** Real-time collaboration (future)

### Rambam Layers

```
Layer 1 (Now):
├── All data in localStorage/OPFS
├── Works offline after first load
└── Manual "Download Week" for prefetch

Layer 2 (Future):
├── Optional sync code for cross-device
├── Background sync when online
└── Conflict resolution (last-write-wins)

Layer 3 (Maybe):
├── Share progress with chavruta
└── Community streaks
```

---

## Lesson 4: Cache-First, Not Network-First

### Network-First (Bad for UX)

```
Request → Try network → Timeout after 3s → Fall back to cache
                              ↓
                    User waits 3 seconds!
```

### Cache-First (Good for UX)

```
Request → Return cached immediately → Update cache in background
                   ↓
          User sees content instantly!
                   ↓
          (Later) New content appears if available
```

### Service Worker Strategy for Rambam

```javascript
// Halakha texts: Cache-first (they rarely change)
{
  urlPattern: /api\/v3\/texts/,
  handler: 'CacheFirst',
  options: { expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 } }
}

// Calendar data: Stale-while-revalidate (need fresh, but cache is acceptable)
{
  urlPattern: /api\/calendars/,
  handler: 'StaleWhileRevalidate',
  options: { expiration: { maxAgeSeconds: 24 * 60 * 60 } }
}
```

---

## Lesson 5: Show Updates Non-Intrusively

When new content is available in background, don't interrupt the user.

### Bad: Modal/Overlay

```
┌──────────────────────────────────┐
│                                  │
│    ┌────────────────────────┐    │
│    │  Update Available!     │    │  ← Blocks interaction
│    │  [Refresh Now]         │    │
│    └────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

### Good: Non-Blocking Banner

```
┌──────────────────────────────────┐
│  [Header]                        │
│  ┌────────────────────────────┐  │
│  │  Content continues to work │  │
│  │  normally while banner     │  │
│  │  is visible below          │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ New content available [↻]  │  │  ← Non-blocking, at bottom
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Implementation

```tsx
function UpdateBanner() {
  const { hasUpdate, applyUpdate } = useServiceWorker()

  if (!hasUpdate) return null

  return (
    <div className="fixed bottom-0 inset-x-0 p-4 bg-blue-600 text-white
                    flex justify-between items-center z-40
                    safe-area-inset-bottom">
      <span>עדכון זמין</span>
      <button onClick={applyUpdate} className="btn-white">
        עדכן עכשיו
      </button>
    </div>
  )
}
```

**Key points:**
- Fixed to bottom, not overlaying content
- User can continue using app
- Click to update when ready
- Respects safe-area-inset for notched phones

---

## Lesson 6: Data Portability is User Respect

Users should be able to:
1. **Export** all their data in a standard format
2. **Import** data from backup
3. **Access** data without the app (open formats)

### Rambam Application

```typescript
interface ExportedData {
  version: 1
  exportedAt: string
  settings: {
    startDate: string
    chaptersPerDay: 1 | 3
    autoMarkPrevious: boolean
    location?: StoredLocation
  }
  completion: Record<string, string>  // dateIndex → timestamp
}

function exportData(): ExportedData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: store.getSettings(),
    completion: store.getCompletion()
  }
}

function downloadBackup() {
  const data = exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rambam-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
}
```

---

## Lesson 7: Design for Longevity

Ask: **"Will this still work in 10 years?"**

### Good Choices

- ✅ JSON for data storage (universal, readable)
- ✅ Standard Web APIs (localStorage, OPFS, Service Workers)
- ✅ No required backend
- ✅ Open source dependencies

### Bad Choices

- ❌ Proprietary sync services
- ❌ Vendor-specific storage
- ❌ Required accounts
- ❌ Binary data formats

### Rambam Longevity Checklist

- [x] Works without account
- [x] Data stored locally in JSON
- [x] Can export all data
- [x] Sefaria API is open/documented
- [x] No proprietary dependencies
- [ ] Consider: bundle Sefaria data for true offline?

---

## Lesson 8: Conflict Resolution Strategy

For Rambam's data model, conflicts are simple:

### Completion Status

**Strategy: Last-Write-Wins**

```
Device A marks halakha 5 complete at 10:00
Device B marks halakha 5 complete at 10:05

Merge: Use 10:05 timestamp (later wins)
Result: Halakha 5 completed at 10:05
```

This works because:
- Completion is idempotent (marking complete twice = same result)
- Timestamp provides deterministic ordering
- No "undo" conflicts (if user uncompletes, that's a new action with later timestamp)

### Settings

**Strategy: Last-Write-Wins**

```
Device A sets chapters=3 at 10:00
Device B sets chapters=1 at 10:05

Merge: Use chapters=1 (later timestamp)
```

This is acceptable because:
- Settings changes are intentional
- User expects latest change to win
- Rare conflict scenario

---

## Summary: The Local-First Checklist

### Must Have

- [ ] App works offline after first load
- [ ] All data stored locally (localStorage/OPFS)
- [ ] Instant UI response (< 100ms)
- [ ] No required network for core functionality
- [ ] Export data in open format (JSON)

### Should Have

- [ ] Pre-fetch content for offline use
- [ ] Cache-first service worker strategy
- [ ] Non-blocking update notifications
- [ ] Background sync when online

### Nice to Have

- [ ] Cross-device sync (optional)
- [ ] End-to-end encryption
- [ ] Conflict resolution UI

---

## References

- [Local-First Software (Ink & Switch)](https://www.inkandswitch.com/local-first/)
- [2Brew PWA](https://2brew.github.io/)
- [Bangle.io](https://bangle.io)
- [OPFS Documentation](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
