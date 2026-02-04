# Next.js Migration Plan

## Overview

Migrate from single-file vanilla JS PWA to Next.js 14+ with App Router, deployed on Cloudflare Pages via GitHub Actions.

**Current State:** Single `index.html` (2,400 lines) with embedded CSS/JS
**Target State:** Next.js app with component architecture, TypeScript, Tailwind CSS

---

## Phase 1: Project Setup (Day 1)

### 1.1 Initialize Next.js Project

```bash
npx create-next-app@latest rambam-next --typescript --tailwind --app --src-dir
cd rambam-next
```

### 1.2 Install Dependencies

```bash
# State management
npm install zustand

# PWA support
npm install next-pwa

# Date utilities (optional, can use native)
npm install date-fns date-fns-tz
```

### 1.3 Configure for Cloudflare Pages

```bash
npm install @cloudflare/next-on-pages
```

**next.config.js:**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/www\.sefaria\.org\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'sefaria-api', expiration: { maxEntries: 500 } }
    },
    {
      urlPattern: /^https:\/\/www\.hebcal\.com\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'hebcal-api', expiration: { maxEntries: 100 } }
    }
  ]
})

module.exports = withPWA({
  output: 'export', // Static export for Cloudflare Pages
})
```

### 1.4 GitHub Actions Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy out --project-name=rambam
```

---

## Phase 2: Core Architecture (Days 2-3)

### 2.1 Directory Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (RTL, fonts, meta)
│   ├── page.tsx            # Main app page
│   ├── globals.css         # Tailwind + custom styles
│   └── manifest.json       # PWA manifest (moved to app/)
├── components/
│   ├── Header.tsx
│   ├── StatsBar.tsx
│   ├── DayGroup.tsx
│   ├── HalakhaCard.tsx
│   ├── Settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── ChapterToggle.tsx
│   │   ├── DatePicker.tsx
│   │   └── Changelog.tsx
│   └── InstallPrompt.tsx
├── hooks/
│   ├── useSwipeGesture.ts
│   ├── useIsraeliDate.ts
│   ├── useHalakhaData.ts
│   └── useStats.ts
├── stores/
│   ├── appStore.ts         # Main app state (Zustand)
│   └── uiStore.ts          # UI state
├── services/
│   ├── sefaria.ts
│   ├── hebcal.ts
│   └── geocoding.ts
├── utils/
│   ├── dates.ts
│   ├── hebrewNumbers.ts
│   └── storage.ts
└── types/
    └── index.ts
```

### 2.2 Type Definitions

**src/types/index.ts:**
```typescript
export interface DayData {
  he: string;           // Hebrew display text
  ref: string;          // Sefaria reference
  count: number;        // Number of halachot
  heDate?: string;      // Hebrew date (ט״ו שבט)
}

export interface HalakhaText {
  text: string;
  chapter?: number;     // For chapter dividers
  isFirstInChapter?: boolean;
}

export interface CompletionMap {
  [key: string]: string; // "2026-02-03:0" -> ISO timestamp
}

export interface UserSettings {
  startDate: string;
  chaptersPerDay: 1 | 3;
  autoMarkPrevious: boolean;
}

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface SunsetData {
  hour: number;
  minute: number;
  coords: Coords;
  locationName: string;
  isDefault: boolean;
}

export interface Stats {
  completedDays: number;
  totalDays: number;
  todayPercent: number;
  backlog: number;
}
```

### 2.3 Zustand Store

**src/stores/appStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // Settings
  startDate: string;
  chaptersPerDay: 1 | 3;
  autoMarkPrevious: boolean;

  // Data
  days: Record<string, DayData>;
  completion: Record<string, string>;

  // Actions
  setStartDate: (date: string) => void;
  setChaptersPerDay: (count: 1 | 3) => void;
  setAutoMarkPrevious: (enabled: boolean) => void;
  setDayData: (date: string, data: DayData) => void;
  markComplete: (dateIndex: string) => void;
  markIncomplete: (dateIndex: string) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      startDate: '',
      chaptersPerDay: 3,
      autoMarkPrevious: true,
      days: {},
      completion: {},

      setStartDate: (date) => set({ startDate: date }),
      setChaptersPerDay: (count) => set({ chaptersPerDay: count }),
      setAutoMarkPrevious: (enabled) => set({ autoMarkPrevious: enabled }),
      setDayData: (date, data) => set((state) => ({
        days: { ...state.days, [date]: data }
      })),
      markComplete: (dateIndex) => set((state) => ({
        completion: { ...state.completion, [dateIndex]: new Date().toISOString() }
      })),
      markIncomplete: (dateIndex) => set((state) => {
        const { [dateIndex]: _, ...rest } = state.completion;
        return { completion: rest };
      }),
      resetAll: () => set({
        startDate: '',
        days: {},
        completion: {},
      }),
    }),
    {
      name: 'rambam-storage',
      // Migrates old localStorage keys on first load
      onRehydrateStorage: () => (state) => {
        // Migration logic from old keys if needed
      }
    }
  )
)
```

---

## Phase 3: Critical Hooks (Days 3-4)

### 3.1 Israeli Date Hook (CRITICAL)

**src/hooks/useIsraeliDate.ts:**
```typescript
import { useMemo } from 'react'

const ISRAEL_TZ = 'Asia/Jerusalem'

export function useIsraeliDate(sunsetHour = 18, sunsetMinute = 0) {
  return useMemo(() => {
    const now = new Date()

    // Get current time in Israel
    const israelTime = new Date(now.toLocaleString('en-US', { timeZone: ISRAEL_TZ }))

    // Check if past sunset
    const currentHour = israelTime.getHours()
    const currentMinute = israelTime.getMinutes()
    const isPastSunset = currentHour > sunsetHour ||
      (currentHour === sunsetHour && currentMinute >= sunsetMinute)

    // If past sunset, advance to next day
    if (isPastSunset) {
      israelTime.setDate(israelTime.getDate() + 1)
    }

    // Return ISO date string
    return israelTime.toISOString().split('T')[0]
  }, [sunsetHour, sunsetMinute])
}
```

### 3.2 Swipe Gesture Hook (CRITICAL)

**src/hooks/useSwipeGesture.ts:**
```typescript
import { useRef, useCallback, useEffect } from 'react'

interface SwipeOptions {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onDoubleTap?: () => void;
  threshold?: number;
}

export function useSwipeGesture<T extends HTMLElement>(options: SwipeOptions) {
  const ref = useRef<T>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const isDragging = useRef(false)
  const lastTap = useRef(0)

  const threshold = options.threshold ?? 100

  const handleStart = useCallback((clientX: number) => {
    isDragging.current = true
    startX.current = clientX
    currentX.current = clientX

    if (ref.current) {
      ref.current.style.transition = 'none'
    }
  }, [])

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current || !ref.current) return

    currentX.current = clientX
    const diff = clientX - startX.current

    // RTL: invert the transform
    ref.current.style.transform = `translateX(${-diff}px)`
    ref.current.style.opacity = String(1 - Math.abs(diff) / 300)
  }, [])

  const handleEnd = useCallback(() => {
    if (!isDragging.current || !ref.current) return

    isDragging.current = false
    const diff = currentX.current - startX.current

    ref.current.style.transition = 'transform 0.3s, opacity 0.3s'
    ref.current.style.transform = ''
    ref.current.style.opacity = ''

    // RTL: swipe directions are inverted
    if (diff < -threshold) {
      options.onSwipeRight()
    } else if (diff > threshold) {
      options.onSwipeLeft()
    }
  }, [options, threshold])

  const handleDoubleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      options.onDoubleTap?.()
    }
    lastTap.current = now
  }, [options])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Touch events
    const onTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX)
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)
    const onTouchEnd = () => handleEnd()

    // Mouse events
    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX)
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const onMouseUp = () => handleEnd()
    const onMouseLeave = () => handleEnd()

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('dblclick', handleDoubleTap)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('dblclick', handleDoubleTap)
    }
  }, [handleStart, handleMove, handleEnd, handleDoubleTap])

  return ref
}
```

---

## Phase 4: API Services (Day 4)

### 4.1 Sefaria Service

**src/services/sefaria.ts:**
```typescript
const SEFARIA_API = 'https://www.sefaria.org'

export interface CalendarEntry {
  he: string;
  ref: string;
}

export async function fetchCalendar(date: string): Promise<CalendarEntry | null> {
  const [year, month, day] = date.split('-')
  const url = `${SEFARIA_API}/api/calendars?day=${parseInt(day)}&month=${parseInt(month)}&year=${year}`

  const res = await fetch(url)
  const data = await res.json()

  const entries = data.calendar_items?.filter((item: any) =>
    item.title?.en?.includes('Daily Rambam')
  ) || []

  // Prefer 3-chapter if available
  const entry = entries.find((e: any) => e.title?.en?.includes('3 Chapters')) || entries[0]

  if (!entry) return null

  return {
    he: entry.displayValue?.he || '',
    ref: entry.ref || ''
  }
}

export interface HalakhaResult {
  texts: string[];
  chapterBreaks: number[]; // Indices where new chapters start
}

export async function fetchHalakhot(ref: string): Promise<HalakhaResult> {
  const url = `${SEFARIA_API}/api/v3/texts/${encodeURIComponent(ref)}`

  const res = await fetch(url)
  const data = await res.json()

  const texts: string[] = []
  const chapterBreaks: number[] = []

  const version = data.versions?.[0]
  if (!version) return { texts: [], chapterBreaks: [] }

  if (data.isSpanning && Array.isArray(version.text)) {
    // Multiple chapters
    for (const chapter of version.text) {
      chapterBreaks.push(texts.length)
      if (Array.isArray(chapter)) {
        texts.push(...chapter)
      } else if (chapter) {
        texts.push(chapter)
      }
    }
  } else if (Array.isArray(version.text)) {
    // Single chapter
    texts.push(...version.text)
  }

  return { texts, chapterBreaks }
}
```

### 4.2 Hebcal Service

**src/services/hebcal.ts:**
```typescript
const HEBCAL_API = 'https://www.hebcal.com'

export async function fetchSunset(date: string, coords: Coords): Promise<{ hour: number; minute: number }> {
  const url = `${HEBCAL_API}/zmanim?cfg=json&latitude=${coords.latitude}&longitude=${coords.longitude}&date=${date}`

  const res = await fetch(url)
  const data = await res.json()

  const sunset = new Date(data.times?.sunset)
  return {
    hour: sunset.getHours(),
    minute: sunset.getMinutes()
  }
}

export async function fetchHebrewDate(date: string): Promise<string> {
  const url = `${HEBCAL_API}/converter?cfg=json&date=${date}`

  const res = await fetch(url)
  const data = await res.json()

  const { d, m } = data.heDateParts || {}
  if (!d || !m) return ''

  return `${toHebrewLetter(d)} ${m}`
}

function toHebrewLetter(num: number): string {
  // Hebrew numeral conversion logic
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
  const tens = ['', 'י', 'כ', 'ל']

  if (num === 15) return 'ט״ו'
  if (num === 16) return 'ט״ז'

  const t = Math.floor(num / 10)
  const o = num % 10

  let result = tens[t] + ones[o]
  if (result.length === 1) return result + '׳'
  return result.slice(0, -1) + '״' + result.slice(-1)
}
```

---

## Phase 5: Components (Days 5-7)

### 5.1 Component Breakdown

| Component | Complexity | Notes |
|-----------|------------|-------|
| `Header` | Low | Logo, title, settings button, calendar picker |
| `StatsBar` | Low | Three stat boxes, derives from store |
| `DayGroup` | Medium | Expandable `<details>`, lazy loads content |
| `HalakhaCard` | High | Swipe gesture, completion state, auto-scroll |
| `ChapterDivider` | Low | Visual separator between chapters |
| `SettingsPanel` | Medium | Slide-in panel with multiple controls |
| `InstallPrompt` | Medium | PWA install handling, event-based |

### 5.2 Key Component: HalakhaCard

```tsx
'use client'

import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { useAppStore } from '@/stores/appStore'

interface Props {
  date: string;
  index: number;
  text: string;
  isCompleted: boolean;
}

export function HalakhaCard({ date, index, text, isCompleted }: Props) {
  const { markComplete, markIncomplete, autoMarkPrevious } = useAppStore()
  const dateIndex = `${date}:${index}`

  const ref = useSwipeGesture<HTMLDivElement>({
    onSwipeRight: () => {
      markComplete(dateIndex)
      // Auto-mark previous if enabled
      if (autoMarkPrevious) {
        for (let i = 0; i < index; i++) {
          markComplete(`${date}:${i}`)
        }
      }
      // Scroll to next card
      scrollToNext()
    },
    onSwipeLeft: () => markIncomplete(dateIndex),
    onDoubleTap: () => isCompleted ? markIncomplete(dateIndex) : markComplete(dateIndex)
  })

  return (
    <div
      ref={ref}
      className={`halakha-card ${isCompleted ? 'completed' : ''}`}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}
```

---

## Phase 6: Migration Execution

### 6.1 Migration Strategy

**Option A: Big Bang (Recommended)**
- Build entire Next.js app in parallel
- Copy to new directory, don't touch existing
- Switch DNS when ready
- Keep old version as fallback

**Option B: Incremental (Higher Risk)**
- Not recommended for this size app
- Would require maintaining two codebases

### 6.2 Data Migration

LocalStorage keys remain compatible:
```typescript
// Old keys -> New store
'rambam_start'      -> appStore.startDate
'rambam_chapters'   -> appStore.chaptersPerDay
'rambam_auto_mark'  -> appStore.autoMarkPrevious
'rambam_days'       -> appStore.days
'rambam_done'       -> appStore.completion
```

Add migration in Zustand persist `onRehydrateStorage` to read old keys on first load.

---

## Phase 7: Testing & QA (Day 8)

### 7.1 Critical Test Cases

- [ ] Swipe right marks complete (touch + mouse)
- [ ] Swipe left marks incomplete
- [ ] Double-tap toggles completion
- [ ] Auto-mark previous works correctly
- [ ] Stats update in real-time
- [ ] Day advances at sunset (not midnight)
- [ ] Offline mode works
- [ ] PWA installs correctly (iOS + Android)
- [ ] RTL layout renders correctly
- [ ] Hebrew text displays properly
- [ ] Settings persist across sessions
- [ ] Data migrates from old localStorage keys

### 7.2 Device Testing

- [ ] iPhone Safari (PWA)
- [ ] Android Chrome (PWA)
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari

---

## Effort Estimate

| Phase | Effort | Notes |
|-------|--------|-------|
| 1. Setup | 2-3 hours | Boilerplate, config |
| 2. Architecture | 4-6 hours | Types, stores, structure |
| 3. Hooks | 4-6 hours | Critical logic extraction |
| 4. Services | 2-3 hours | API wrappers |
| 5. Components | 8-12 hours | UI implementation |
| 6. Migration | 2-3 hours | Data compat, deploy |
| 7. Testing | 4-6 hours | QA across devices |

**Total: ~30-40 hours** (1-2 weeks part-time)

---

## Future Enhancements (Post-Migration)

With Next.js + Cloudflare infrastructure:

1. **Cross-Device Sync**
   - Add Cloudflare KV binding
   - Create `/api/sync/[code]` route
   - Simple 6-char sync codes

2. **Push Notifications**
   - Add Cloudflare Workers cron trigger
   - Store push subscriptions in KV
   - Send daily reminders

3. **Analytics**
   - Cloudflare Analytics (built-in)
   - Or simple KV-based event tracking

4. **Sharing**
   - Share progress as image
   - Export/import JSON backup
