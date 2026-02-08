# Rambam Daily Study App

## Development

- **Dev server port**: 3613 (http://localhost:3613)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State management**: Zustand with persist middleware
- **i18n**: next-intl (Hebrew and English)

## Project Structure

- `src/app/[locale]/` - Next.js App Router pages
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand stores
- `src/services/` - Data services (Sefaria text API, local schedule computation, HebCal sunset)
- `src/i18n/messages/` - Translation files (en.json, he.json)
- `src/types/` - TypeScript types
- `public/` - Static assets (logo, icons, manifest)

## Shell Commands

- Don't use `git -C` — the working directory is already the project root. Just use `git` directly.

## Key Features

- Multi-path study tracking (Rambam 3 chapters, Rambam 1 chapter, Sefer HaMitzvot)
- Hebrew calendar integration
- Swipe gestures for marking completion
- PWA with offline support
- Hide completed items setting

## Data Architecture — Two-Layer Cache

The app has two data layers that must stay in sync. Any code that downloads or fetches data **must update both layers**, or the UI will not reflect the download.

### Layer 1: Zustand Store (reactive UI state, persisted to localStorage)
- `days[path][date]` — calendar metadata + texts for each study day
- `done[path:date:index]` — completion timestamps (never deleted)
- Bookmarks, summaries, settings — all user data lives here
- **UI reads from this layer** — if it's not in Zustand, the UI doesn't see it

### Layer 2: IndexedDB (persistent text/calendar cache)
- `texts` store — full halakha text keyed by Sefaria ref
- `calendar` store — calendar metadata keyed by `path:date`
- `meta` store — app metadata (e.g. `lastDailyPrefetch` date)
- **Network-fetched data lands here first** — serves as offline cache

### The Critical Rule
When downloading content (prefetch, background sync, page load), always:
1. Fetch from network → saves to IndexedDB (via `fetchCalendar`/`fetchHalakhot`)
2. Call `setDayData()` → updates Zustand store so UI reflects the download

Forgetting step 2 causes the "invisible download" bug: data is cached in IndexedDB but the UI still shows items as missing.

### Data Refresh Triggers
The Jewish date (`today`) drives all data loading. It updates automatically via `useJewishDate()` hook on:
- **Sunset crossing** — timer fires at sunset + 1s
- **Tab becoming visible** — `visibilitychange` listener
- **Civil midnight** — timer fires at 00:00 + 1s
- **Stale sunset data** — refetches from Hebcal if `sunset.date !== today`

When `today` changes, these systems react:
- **Home page `loadMissingDays`** — fetches any dates from `startDate..today` not yet in Zustand
- **Background sync `runDailyPrefetch`** — downloads `today + daysAhead` future days (runs once per Jewish day, triggered by 30-min timer / tab visibility / online event)
- **Cleanup** — removes old IndexedDB entries for completed, non-pinned, non-bookmarked days past `textRetentionDays`

### Prefetch Window
- `daysAhead` setting (1–14, default 3) controls how many future days to keep downloaded
- The UI shows `daysAhead + 1` pills (today + N ahead) — loops must use `i <= daysAhead`
- Background sync marks the current Jewish date in IndexedDB meta (`lastDailyPrefetch`) so it only runs the full prefetch once per day

## Data Philosophy

- **Never delete user data**: completion records (`done`), day metadata (`days`), bookmarks, and summaries in Zustand are never cleaned up automatically. `cleanupOldDays` is intentionally a no-op.
- **Only clean cached text**: IndexedDB text/calendar cache is cleaned by `cleanupCompletedDays` based on `textRetentionDays` setting. Pinned days are excluded from cleanup.
- **Export format**: v3 includes a `settings` block with all preferences (theme, activePaths, etc.). Backward-compatible with v1/v2 imports.
- **Bookmarks store text**: Bookmarks include `textHe`/`textEn` fields for offline access and export.

## Data Sources

- **`@hebcal/learning` + `@hebcal/core`** (local, no network): Sefer HaMitzvot study schedule (`resolveMitzvotSchedule`) and Hebrew date computation (`computeHebrewDate`). Always available offline.
- **Sefaria Calendar API** (`sefaria.org/api/calendars`): Study schedule for Rambam 1 & 3 chapters. Refs from this API are guaranteed to match the Sefaria Text API.
- **Sefaria Text API** (`sefaria.org/api/v3/texts/`): Halakha text content (Hebrew and English). The only remaining network dependency for core reading functionality.
- **HebCal Zmanim API** (`hebcal.com/zmanim`): Sunset times for the user's GPS location. Called lazily, not on startup.

## API Failure Behavior

- **Study schedules**: Sefer HaMitzvot never fails (computed locally). Rambam schedules fail gracefully with stale IndexedDB cache.
- **Hebrew dates**: Never fail (computed locally via `@hebcal/core`).
- **Text content**: Hebrew and English are fetched independently via `Promise.allSettled`. Neither is individually fatal — only throws if **both** fail. `languagesLoaded` tracks which succeeded.
- **Language fallback**: If user wants English but it failed, HalakhaCard falls back to showing Hebrew with an amber warning banner. InfoSheet shows context-aware error for translation peek.
- **Offline**: Stale IndexedDB cache is always preferred over network errors. Prefetch failures are silently swallowed (best-effort).
