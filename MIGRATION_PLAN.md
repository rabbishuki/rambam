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

# SSR-safe hooks (useLocalStorage, useMediaQuery, etc.)
npm install usehooks-ts

# Internationalization
npm install next-intl

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
│   ├── [locale]/           # i18n route group
│   │   ├── layout.tsx      # Locale-specific layout
│   │   └── page.tsx        # Main app page
│   ├── layout.tsx          # Root layout (fonts, meta)
│   └── globals.css         # Tailwind + custom styles
├── components/
│   ├── ui/                 # Reusable primitives (max ~100 lines each)
│   │   ├── Button.tsx
│   │   ├── Toggle.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── StatsBar.tsx
│   │   └── Footer.tsx
│   ├── halakha/
│   │   ├── DayGroup.tsx
│   │   ├── HalakhaCard.tsx
│   │   └── ChapterDivider.tsx
│   ├── settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── ChapterToggle.tsx
│   │   ├── DatePicker.tsx
│   │   ├── LocationPicker.tsx   # NEW: Manual location input
│   │   └── Changelog.tsx
│   ├── location/
│   │   ├── LocationPrompt.tsx   # NEW: First-time location setup
│   │   └── LocationDisplay.tsx
│   ├── offline/
│   │   └── OfflineIndicator.tsx # NEW: Shows offline/sync status
│   └── InstallPrompt.tsx
├── hooks/
│   ├── useSwipeGesture.ts
│   ├── useIsraeliDate.ts
│   ├── useHalakhaData.ts
│   ├── useStats.ts
│   ├── useLocation.ts          # NEW: Location with caching
│   └── usePrefetch.ts          # NEW: Week-ahead download
├── stores/
│   ├── appStore.ts             # Main app state (Zustand)
│   ├── locationStore.ts        # NEW: Location state
│   └── offlineStore.ts         # NEW: Offline/sync state
├── services/
│   ├── sefaria.ts
│   ├── hebcal.ts
│   ├── geocoding.ts
│   └── prefetch.ts             # NEW: Batch download logic
├── i18n/
│   ├── config.ts               # next-intl configuration
│   ├── request.ts              # Server-side locale detection
│   └── messages/
│       ├── he.json             # Hebrew strings (primary)
│       └── en.json             # English strings
├── utils/
│   ├── dates.ts
│   ├── hebrewNumbers.ts
│   └── constants.ts            # Shared constants
├── lib/
│   └── sw/                     # Service worker utilities
│       ├── cache.ts
│       └── sync.ts
└── types/
    └── index.ts
```

### 2.2 Code Architecture Rules

**Rule 1: DRY (Don't Repeat Yourself)**
- Extract repeated logic into hooks or utilities
- Shared UI patterns go in `components/ui/`
- API response parsing centralized in services

**Rule 2: File Size Limits**
- Components: Max ~150 lines (split into subcomponents if larger)
- Hooks: Max ~100 lines (split logic into smaller hooks)
- Services: Max ~200 lines (split by endpoint group)
- No single file should "do too much"

**Rule 3: Single Responsibility**
- Each component does ONE thing
- Each hook manages ONE concern
- Each service handles ONE external API

**Rule 4: Colocation**
- Component-specific types live with the component
- Component-specific styles in same file (Tailwind) or `.module.css`
- Tests colocated: `Component.test.tsx` next to `Component.tsx`

### 2.3 Type Definitions

**src/types/index.ts:**
```typescript
export interface DayData {
  he: string;           // Hebrew display text
  ref: string;          // Sefaria reference
  count: number;        // Number of halachot
  heDate?: string;      // Hebrew date (ט״ו שבט)
  texts?: string[];     // Prefetched halakha texts (for offline)
  chapterBreaks?: number[];
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
  autoMarkPrevious: boolean;  // Default: FALSE
}

export interface Coords {
  latitude: number;
  longitude: number;
}

// Location stored in localStorage (persists across sessions)
export interface StoredLocation {
  coords: Coords;
  cityName: string;
  isManual: boolean;        // true if user typed it in
  updatedAt: string;        // ISO timestamp for cache invalidation
}

export interface SunsetData {
  hour: number;
  minute: number;
  date: string;             // Which date this sunset is for
}

export interface Stats {
  completedDays: number;
  totalDays: number;
  todayPercent: number;
  backlog: number;
}

// Offline/prefetch status
export interface PrefetchStatus {
  lastPrefetch: string | null;  // ISO timestamp
  prefetchedDates: string[];    // Dates available offline
  isPrefetching: boolean;
}
```

### 2.4 Zustand Stores

**src/stores/appStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  // Settings
  startDate: string;
  chaptersPerDay: 1 | 3;
  autoMarkPrevious: boolean;  // Default: FALSE

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
      autoMarkPrevious: false,  // DEFAULT: OFF (user must opt-in)
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
      onRehydrateStorage: () => (state) => {
        // Migration from old localStorage keys
      }
    }
  )
)
```

**src/stores/locationStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { StoredLocation, SunsetData } from '@/types'

const LOCATION_CACHE_DURATION = 60 * 60 * 1000 // 1 hour in ms

interface LocationState {
  // Persisted location (survives page reload)
  location: StoredLocation | null;
  sunset: SunsetData | null;

  // UI state
  hasPromptedForLocation: boolean;
  isLoadingLocation: boolean;

  // Actions
  setLocation: (location: StoredLocation) => void;
  setSunset: (sunset: SunsetData) => void;
  setHasPrompted: () => void;
  clearLocation: () => void;

  // Computed
  isLocationStale: () => boolean;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      location: null,
      sunset: null,
      hasPromptedForLocation: false,
      isLoadingLocation: false,

      setLocation: (location) => set({ location, isLoadingLocation: false }),
      setSunset: (sunset) => set({ sunset }),
      setHasPrompted: () => set({ hasPromptedForLocation: true }),
      clearLocation: () => set({ location: null, sunset: null }),

      isLocationStale: () => {
        const { location } = get()
        if (!location) return true
        const age = Date.now() - new Date(location.updatedAt).getTime()
        return age > LOCATION_CACHE_DURATION
      },
    }),
    {
      name: 'rambam-location',
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

### 3.3 Location Hook (NEW)

**src/hooks/useLocation.ts:**
```typescript
'use client'

import { useCallback } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useLocationStore } from '@/stores/locationStore'
import { fetchSunset } from '@/services/hebcal'
import { fetchLocationName } from '@/services/geocoding'
import type { StoredLocation, Coords } from '@/types'

const DEFAULT_COORDS: Coords = { latitude: 32.0853, longitude: 34.7818 } // Tel Aviv

export function useLocation() {
  const {
    location,
    sunset,
    hasPromptedForLocation,
    setLocation,
    setSunset,
    setHasPrompted,
    isLocationStale,
  } = useLocationStore()

  // Request browser geolocation (only when user clicks "Use My Location")
  const requestBrowserLocation = useCallback(async () => {
    return new Promise<Coords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        (err) => reject(err),
        {
          // City-level accuracy is fine - don't need high precision
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 3600000, // Accept cached position up to 1 hour old
        }
      )
    })
  }, [])

  // Set location from browser geolocation
  const useMyLocation = useCallback(async () => {
    try {
      const coords = await requestBrowserLocation()
      const cityName = await fetchLocationName(coords)

      const stored: StoredLocation = {
        coords,
        cityName,
        isManual: false,
        updatedAt: new Date().toISOString(),
      }

      setLocation(stored)
      setHasPrompted()

      // Fetch sunset for this location
      const today = new Date().toISOString().split('T')[0]
      const sunsetData = await fetchSunset(today, coords)
      setSunset({ ...sunsetData, date: today })

      return stored
    } catch (err) {
      throw err
    }
  }, [requestBrowserLocation, setLocation, setSunset, setHasPrompted])

  // Set location manually (user types city name)
  const setManualLocation = useCallback(async (cityName: string, coords: Coords) => {
    const stored: StoredLocation = {
      coords,
      cityName,
      isManual: true,
      updatedAt: new Date().toISOString(),
    }

    setLocation(stored)
    setHasPrompted()

    // Fetch sunset
    const today = new Date().toISOString().split('T')[0]
    const sunsetData = await fetchSunset(today, coords)
    setSunset({ ...sunsetData, date: today })

    return stored
  }, [setLocation, setSunset, setHasPrompted])

  // Refresh location if stale (called on app focus after 1hr inactivity)
  const refreshIfStale = useCallback(async () => {
    if (!location || !isLocationStale()) return

    // Only auto-refresh if it was a browser location (not manual)
    if (location.isManual) return

    try {
      const coords = await requestBrowserLocation()
      const cityName = await fetchLocationName(coords)

      setLocation({
        coords,
        cityName,
        isManual: false,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      // Silently fail - keep existing location
    }
  }, [location, isLocationStale, requestBrowserLocation, setLocation])

  return {
    location,
    sunset,
    hasPromptedForLocation,
    needsLocationSetup: !hasPromptedForLocation && !location,
    useMyLocation,
    setManualLocation,
    refreshIfStale,
    defaultCoords: DEFAULT_COORDS,
  }
}
```

**Key Design Decisions:**
1. **No auto-request on load** - User must explicitly click "Use My Location"
2. **Manual input option** - User can type city name instead
3. **City-level accuracy** - `enableHighAccuracy: false` saves battery
4. **1-hour cache** - Location refreshes after 1hr of inactivity
5. **SSR-safe** - Uses usehooks-ts patterns, store hydration handled

---

## Phase 3.5: Internationalization (i18n)

### Setup with next-intl

**src/i18n/config.ts:**
```typescript
export const locales = ['he', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'he'
```

**src/i18n/messages/he.json:**
```json
{
  "common": {
    "appName": "רמב\"ם יומי",
    "settings": "הגדרות",
    "close": "סגור",
    "save": "שמור",
    "cancel": "ביטול"
  },
  "stats": {
    "completedDays": "ימים",
    "todayProgress": "היום",
    "backlog": "חוב"
  },
  "location": {
    "title": "הגדר מיקום",
    "description": "המיקום שלך משמש לחישוב זמן השקיעה",
    "useMyLocation": "השתמש במיקום שלי",
    "enterManually": "הזן ידנית",
    "cityPlaceholder": "שם העיר...",
    "currentLocation": "מיקום נוכחי",
    "permissionDenied": "הגישה למיקום נדחתה"
  },
  "halakha": {
    "markComplete": "החלק ימינה לסימון",
    "markIncomplete": "החלק שמאלה לביטול",
    "chapter": "פרק"
  },
  "settings": {
    "chaptersPerDay": "פרקים ליום",
    "oneChapter": "פרק אחד",
    "threeChapters": "שלושה פרקים",
    "autoMark": "סמן אוטומטית הלכות קודמות",
    "startDate": "תאריך התחלה",
    "resetProgress": "אפס התקדמות",
    "updateLocation": "עדכן מיקום"
  },
  "offline": {
    "downloadWeek": "הורד שבוע מראש",
    "downloading": "מוריד...",
    "availableOffline": "זמין במצב לא מקוון",
    "lastSync": "סנכרון אחרון"
  }
}
```

**src/i18n/messages/en.json:**
```json
{
  "common": {
    "appName": "Daily Rambam",
    "settings": "Settings",
    "close": "Close",
    "save": "Save",
    "cancel": "Cancel"
  },
  "stats": {
    "completedDays": "Days",
    "todayProgress": "Today",
    "backlog": "Backlog"
  },
  "location": {
    "title": "Set Location",
    "description": "Your location is used to calculate sunset time",
    "useMyLocation": "Use My Location",
    "enterManually": "Enter Manually",
    "cityPlaceholder": "City name...",
    "currentLocation": "Current location",
    "permissionDenied": "Location access denied"
  },
  "halakha": {
    "markComplete": "Swipe right to mark complete",
    "markIncomplete": "Swipe left to undo",
    "chapter": "Chapter"
  },
  "settings": {
    "chaptersPerDay": "Chapters per day",
    "oneChapter": "One chapter",
    "threeChapters": "Three chapters",
    "autoMark": "Auto-mark previous halachot",
    "startDate": "Start date",
    "resetProgress": "Reset progress",
    "updateLocation": "Update location"
  },
  "offline": {
    "downloadWeek": "Download week ahead",
    "downloading": "Downloading...",
    "availableOffline": "Available offline",
    "lastSync": "Last sync"
  }
}
```

**Usage in Components:**
```tsx
import { useTranslations } from 'next-intl'

export function StatsBar() {
  const t = useTranslations('stats')

  return (
    <div className="stats">
      <div>{completedDays} {t('completedDays')}</div>
      <div>{todayPercent}% {t('todayProgress')}</div>
      <div>{backlog} {t('backlog')}</div>
    </div>
  )
}
```

**RTL Handling:**
```tsx
// src/app/[locale]/layout.tsx
import { getMessages } from 'next-intl/server'

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()
  const dir = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  )
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

## Phase 4.5: Offline Prefetch System (NEW)

### Overview

Download the week ahead from Sefaria so users can study offline. The PWA should:
1. Load offline-first (use cached data immediately)
2. Check for updates in background
3. Show sync status to user

### Prefetch Service

**src/services/prefetch.ts:**
```typescript
import { fetchCalendar, fetchHalakhot } from './sefaria'
import { fetchHebrewDate } from './hebcal'
import type { DayData } from '@/types'

const PREFETCH_DAYS = 7 // Download 1 week ahead

export async function prefetchWeekAhead(
  startDate: string,
  chaptersPerDay: 1 | 3,
  onProgress?: (completed: number, total: number) => void
): Promise<Record<string, DayData>> {
  const dates = generateDateRange(startDate, PREFETCH_DAYS)
  const results: Record<string, DayData> = {}

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    onProgress?.(i, dates.length)

    try {
      // Fetch calendar entry
      const calendar = await fetchCalendar(date, chaptersPerDay)
      if (!calendar) continue

      // Fetch full text
      const { texts, chapterBreaks } = await fetchHalakhot(calendar.ref)

      // Fetch Hebrew date
      const heDate = await fetchHebrewDate(date)

      results[date] = {
        he: calendar.he,
        ref: calendar.ref,
        count: texts.length,
        heDate,
        texts,           // Store full text for offline
        chapterBreaks,
      }
    } catch (err) {
      console.warn(`Failed to prefetch ${date}:`, err)
      // Continue with other dates
    }
  }

  onProgress?.(dates.length, dates.length)
  return results
}

function generateDateRange(start: string, days: number): string[] {
  const dates: string[] = []
  const date = new Date(start)

  for (let i = 0; i < days; i++) {
    dates.push(date.toISOString().split('T')[0])
    date.setDate(date.getDate() + 1)
  }

  return dates
}
```

### Prefetch Hook

**src/hooks/usePrefetch.ts:**
```typescript
'use client'

import { useState, useCallback } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { useAppStore } from '@/stores/appStore'
import { prefetchWeekAhead } from '@/services/prefetch'
import type { PrefetchStatus } from '@/types'

export function usePrefetch() {
  const { startDate, chaptersPerDay, days, setDayData } = useAppStore()

  const [status, setStatus] = useLocalStorage<PrefetchStatus>('rambam-prefetch', {
    lastPrefetch: null,
    prefetchedDates: [],
    isPrefetching: false,
  })

  const [progress, setProgress] = useState({ completed: 0, total: 0 })

  const downloadWeekAhead = useCallback(async () => {
    if (status.isPrefetching) return

    setStatus(s => ({ ...s, isPrefetching: true }))

    try {
      const today = new Date().toISOString().split('T')[0]
      const data = await prefetchWeekAhead(
        today,
        chaptersPerDay,
        (completed, total) => setProgress({ completed, total })
      )

      // Store prefetched data
      Object.entries(data).forEach(([date, dayData]) => {
        setDayData(date, dayData)
      })

      setStatus({
        lastPrefetch: new Date().toISOString(),
        prefetchedDates: Object.keys(data),
        isPrefetching: false,
      })
    } catch (err) {
      setStatus(s => ({ ...s, isPrefetching: false }))
      throw err
    }
  }, [status.isPrefetching, chaptersPerDay, setDayData, setStatus])

  return {
    ...status,
    progress,
    downloadWeekAhead,
    hasOfflineData: status.prefetchedDates.length > 0,
  }
}
```

### Service Worker Strategy (Offline-First)

**next.config.js (updated):**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Sefaria API: Cache-first for prefetched content
    {
      urlPattern: /^https:\/\/www\.sefaria\.org\/api\/v3\/texts\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'sefaria-texts',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    // Sefaria Calendar API: Network-first (needs fresh data)
    {
      urlPattern: /^https:\/\/www\.sefaria\.org\/api\/calendars.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'sefaria-calendar',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 100 },
      },
    },
    // Hebcal: Network-first with quick timeout
    {
      urlPattern: /^https:\/\/www\.hebcal\.com\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'hebcal-api',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 100 },
      },
    },
  ],
})
```

### Background Sync (Optional Enhancement)

**Service Worker Addition:**
```javascript
// public/sw-custom.js (merged into generated SW)

// Listen for sync event to update content in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-halakhot') {
    event.waitUntil(syncHalakhot())
  }
})

async function syncHalakhot() {
  // Background sync logic - fetch updates when online
  const cache = await caches.open('sefaria-texts')

  // Get list of dates to refresh from IndexedDB
  // Fetch and cache updated content
}
```

### Update Banner (Non-Overlay)

When background updates are available, show a non-intrusive banner at the bottom that doesn't cover other UI.

**src/hooks/useServiceWorkerUpdate.ts:**
```typescript
'use client'

import { useState, useEffect } from 'react'

export function useServiceWorkerUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      const waiting = registration.waiting
      if (waiting) {
        setWaitingWorker(waiting)
        setHasUpdate(true)
      }
    }

    // Check for updates on load
    navigator.serviceWorker.ready.then(registration => {
      // Check if already waiting
      if (registration.waiting) {
        handleUpdate(registration)
      }

      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleUpdate(registration)
          }
        })
      })
    })

    // Listen for controller change (update applied)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  const dismissUpdate = () => {
    setHasUpdate(false)
  }

  return { hasUpdate, applyUpdate, dismissUpdate }
}
```

**src/components/offline/UpdateBanner.tsx:**
```tsx
'use client'

import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate'
import { useTranslations } from 'next-intl'

export function UpdateBanner() {
  const t = useTranslations('offline')
  const { hasUpdate, applyUpdate, dismissUpdate } = useServiceWorkerUpdate()

  if (!hasUpdate) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 safe-area-bottom
                 bg-blue-600 text-white px-4 py-3
                 flex items-center justify-between gap-3
                 shadow-lg"
      role="alert"
    >
      <span className="text-sm flex-1">
        {t('updateAvailable')}
      </span>
      <div className="flex gap-2">
        <button
          onClick={dismissUpdate}
          className="text-blue-100 hover:text-white text-sm"
        >
          {t('later')}
        </button>
        <button
          onClick={applyUpdate}
          className="bg-white text-blue-600 px-3 py-1 rounded-md
                     text-sm font-medium hover:bg-blue-50"
        >
          {t('updateNow')}
        </button>
      </div>
    </div>
  )
}
```

**Add to i18n messages:**
```json
{
  "offline": {
    "updateAvailable": "עדכון זמין",
    "updateNow": "עדכן עכשיו",
    "later": "אחר כך",
    ...
  }
}
```

**Key design decisions:**
1. **Fixed to bottom** - doesn't overlay content, user can continue using app
2. **Dismissible** - user can say "later" and keep working
3. **Non-blocking** - app continues to function normally
4. **Safe area aware** - respects notch/home indicator on mobile
5. **Subtle but visible** - blue background stands out without being intrusive

**Layout consideration:**
```
┌──────────────────────────────────┐
│  [Header]                        │
├──────────────────────────────────┤
│                                  │
│  [Main Content]                  │
│                                  │
│  Cards, halakhot, etc.           │
│                                  │
├──────────────────────────────────┤
│  [Update banner - fixed bottom]  │  ← Doesn't overlap content
└──────────────────────────────────┘
```

### UI Component

**src/components/offline/OfflineIndicator.tsx:**
```tsx
'use client'

import { usePrefetch } from '@/hooks/usePrefetch'
import { useTranslations } from 'next-intl'

export function OfflineIndicator() {
  const t = useTranslations('offline')
  const {
    isPrefetching,
    lastPrefetch,
    progress,
    downloadWeekAhead,
    hasOfflineData,
  } = usePrefetch()

  return (
    <div className="offline-status">
      {hasOfflineData && (
        <span className="text-green-600">
          ✓ {t('availableOffline')}
        </span>
      )}

      <button
        onClick={downloadWeekAhead}
        disabled={isPrefetching}
        className="btn-secondary"
      >
        {isPrefetching
          ? `${t('downloading')} ${progress.completed}/${progress.total}`
          : t('downloadWeek')
        }
      </button>

      {lastPrefetch && (
        <span className="text-gray-500 text-sm">
          {t('lastSync')}: {new Date(lastPrefetch).toLocaleDateString()}
        </span>
      )}
    </div>
  )
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

### 5.2 Key Component: LocationPrompt (First-Time Setup)

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocation } from '@/hooks/useLocation'
import { lookupCity } from '@/services/geocoding'

export function LocationPrompt() {
  const t = useTranslations('location')
  const { useMyLocation, setManualLocation, needsLocationSetup } = useLocation()

  const [mode, setMode] = useState<'choice' | 'manual'>('choice')
  const [cityInput, setCityInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!needsLocationSetup) return null

  const handleUseMyLocation = async () => {
    setLoading(true)
    setError('')
    try {
      await useMyLocation()
    } catch {
      setError(t('permissionDenied'))
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!cityInput.trim()) return

    setLoading(true)
    setError('')
    try {
      // Lookup city coordinates from geocoding API
      const result = await lookupCity(cityInput)
      await setManualLocation(result.name, result.coords)
    } catch {
      setError('City not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="location-prompt modal">
      <h2>{t('title')}</h2>
      <p className="text-gray-600">{t('description')}</p>

      {mode === 'choice' ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUseMyLocation}
            disabled={loading}
            className="btn-primary"
          >
            📍 {t('useMyLocation')}
          </button>

          <button
            onClick={() => setMode('manual')}
            className="btn-secondary"
          >
            ✏️ {t('enterManually')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder={t('cityPlaceholder')}
            className="input"
            autoFocus
          />

          <div className="flex gap-2">
            <button
              onClick={handleManualSubmit}
              disabled={loading || !cityInput.trim()}
              className="btn-primary flex-1"
            >
              {t('save')}
            </button>
            <button
              onClick={() => setMode('choice')}
              className="btn-secondary"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  )
}
```

### 5.3 Key Component: HalakhaCard

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

**Core Functionality:**
- [ ] Swipe right marks complete (touch + mouse)
- [ ] Swipe left marks incomplete
- [ ] Double-tap toggles completion
- [ ] Auto-mark previous works correctly (default OFF)
- [ ] Stats update in real-time
- [ ] Day advances at sunset (not midnight)

**Location:**
- [ ] First visit shows location prompt (not auto-request)
- [ ] "Use My Location" requests permission and saves
- [ ] Manual location input works
- [ ] Location persists across sessions
- [ ] Location refreshes after 1hr inactivity (browser location only)
- [ ] Manual locations never auto-refresh

**Offline & Prefetch:**
- [ ] "Download week ahead" fetches 7 days
- [ ] Prefetched content available offline
- [ ] Progress indicator shows during download
- [ ] App loads offline-first (cached data first)
- [ ] Background updates when online

**i18n:**
- [ ] Hebrew RTL renders correctly
- [ ] English LTR renders correctly
- [ ] Language switch works
- [ ] All strings translated

**PWA:**
- [ ] PWA installs correctly (iOS + Android)
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
| 1. Setup | 2-3 hours | Boilerplate, config, i18n setup |
| 2. Architecture | 4-6 hours | Types, stores, structure, code rules |
| 3. Hooks | 6-8 hours | Swipe, dates, **location**, stats |
| 3.5. i18n | 2-3 hours | Translation files, RTL handling |
| 4. Services | 3-4 hours | API wrappers, **prefetch service** |
| 4.5. Offline | 3-4 hours | Prefetch system, SW config |
| 5. Components | 10-14 hours | UI implementation, **location prompt** |
| 6. Migration | 2-3 hours | Data compat, deploy |
| 7. Testing | 6-8 hours | QA across devices, **offline testing** |

**Total: ~40-55 hours** (2-3 weeks part-time)

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
