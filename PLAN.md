# Plan: Refactor index.html into modular multi-app structure

## Context

The current app is a single 2667-line `index.html` with all CSS, HTML, and JS inline. We need to split it into a modular structure that:
1. Separates concerns (CSS, shared JS, plan-specific JS)
2. Supports adding new "plans" (1-chapter, mitzvot, chumash, etc.) as independent apps that share common code
3. Builds the 3-chapter Rambam app in `/rambam3/` as the first modular app

The existing root `index.html` is NOT modified until Step 10 (migration). The `/rambam3/` app is built alongside it first, verified, then 3-chapter users are migrated via a redirect script added to the root.

## Target File Structure

```
/shared/
  styles.css            ← all CSS (extracted from index.html lines 16-908)
  shell.js              ← injects shared HTML: header, stats bar, settings panel, footer, overlays
  core.js               ← rendering, swipe handlers, stats, date utils, localStorage utils, scroll helpers
  api.js                ← Sefaria, Hebcal, BigDataCloud API functions
  changelog.js          ← (move existing changelog.js, keep copy at root for old app)

/rambam3/
  index.html            ← minimal shell (~20 lines), loads shared + plan.js
  plan.js               ← plan config: { id, name, storagePrefix, loadDay(), loadContent() }
  manifest.json         ← PWA manifest for this app
  service-worker.js     ← offline caching for this app

/ (root — unchanged until Step 10)
  index.html            ← current monolithic app, stays as-is until migration redirect is added
  changelog.js          ← stays (used by root app and its service-worker)
  manifest.json         ← stays
  service-worker.js     ← stays
  logo.png, icons, images ← stays (referenced by /rambam3/ via relative paths like ../logo.png)
  PLAN.md               ← this file
  ARCHITECTURE.md       ← architecture guide for future agents
```

## Implementation Steps

### Step 1: Create `shared/` directory and extract CSS ✅ COMPLETE
- Create `/shared/styles.css` — extract all CSS from `index.html` lines 16-908
- No changes to the CSS itself

### Step 2: Create `/shared/api.js` ✅ COMPLETE
Extract from current `index.html`:
- Constants: `SEFARIA_API`, `HEBCAL_API`, `DEFAULT_COORDS`
- State: `textCache`, `cachedSunsetHour/Minute`, `cachedCoords`, `cachedLocationName`, `isUsingDefaultLocation`
- `getUserCoords()` (line 1076)
- `fetchCalendar(date, sefariaTitle)` (line 1269) — add `sefariaTitle` param instead of reading `getChapterCount()`
- `fetchText(ref)` (line 1296)
- `fetchLocationName(coords)` (line 1353)
- `fetchSunset(dateStr, coords)` (line 1373)
- `updateLocationDisplay()` (line 1401)
- `fetchHebrewDate(dateStr)` (line 1426)

### Step 3: Create `/shared/core.js` ✅ COMPLETE
Extract from current `index.html`:
- **localStorage utils**: `getStart()`, `setStart()`, `getAutoMark()`, `setAutoMark()`, `getHideCompleted()`, `setHideCompleted()`, `isFirstVisit()`, `getTodayInIsrael()`, `CYCLE_START`
- **Plan-specific storage** — these functions read `window.PLAN.storagePrefix` to build keys:
  - `getDays()` → reads `{prefix}_days`
  - `saveDays(days)` → writes `{prefix}_days`
  - `getDone()` → reads `{prefix}_done`
  - `saveDone(done)` → writes `{prefix}_done`
  - `markDone(date, index)`
- **Date utils**: `dateRange()`, `formatHebrewDate()`, `toHebrewLetter()`
- **Stats**: `computeStats()`, `renderStats()`, `updateDayHeader()`
- **Data loading**: `loadMissingDays()` — calls `window.PLAN.loadDay(date)` for each missing date
- **Rendering**: `renderDays()`, `handleDayAction()`, `handleDetailsToggle()` — calls `window.PLAN.loadContent()` instead of directly calling `fetchText()`
- **Swipe handlers**: `attachSwipeHandler()`, `scrollToCard()`
- **Completed counter**: `updateCompletedCounter()`
- **Calendar date picker**: `renderSingleDay()`, picker event handlers
- **PWA install**: install prompt logic
- **Service worker registration**: register + update logic
- **Changelog**: `loadChangelog()`
- **Scroll progress**: `updateScrollProgress()`, `onScroll()` (lines 2594-2637)
- **Init**: `init()` — main entry point, reads `window.PLAN`

### Step 4: Create `/shared/shell.js` ✅ COMPLETE
- Function `initShell()` that reads `window.PLAN` and injects into `#app`:
  - Header (logo, title from `PLAN.name`, action buttons: install, calendar, settings)
  - Stats bar (completed days, today %, backlog)
  - Progress bar (for scroll progress)
  - `<main id="mainContent"></main>`
  - Overlay
  - Install prompt
  - Settings panel with sections:
    - Start date (cycle 46 button + date picker)
    - Auto-mark previous halakhot toggle
    - Hide completed toggle
    - Location & sunset
    - Data management (refresh/reset)
    - Changelog
  - Footer with dedications
- **Note**: The "chapter count" toggle is REMOVED from settings — it's no longer needed since each plan is a separate app
- Attaches all settings event listeners

### Step 5: Move `changelog.js` ✅ COMPLETE
- Copy `changelog.js` → `shared/changelog.js`
- Keep original `changelog.js` at root (still needed by root app + its service-worker)

### Step 6: Create `/rambam3/plan.js` ✅ COMPLETE
```js
window.PLAN = {
  id: 'rambam3',
  name: 'רמב"ם יומי',
  storagePrefix: 'rambam3',

  async loadDay(date) {
    const { he, ref } = await fetchCalendar(date, 'Daily Rambam (3 Chapters)');
    const { chapters } = await fetchText(ref);
    const heDate = await fetchHebrewDate(date);
    const count = chapters.reduce((sum, ch) => sum + ch.length, 0);
    return { he, ref, count, heDate };
  },

  async loadContent(date, ref) {
    const { chapters, chapterNumbers } = await fetchText(ref);
    return { chapters, chapterNumbers };
  }
};
```

### Step 7: Create `/rambam3/index.html` ✅ COMPLETE
```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="description" content="Track your daily Rambam (3 chapters) study">
  <meta name="theme-color" content="#2563eb">
  <title>רמב"ם יומי</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../shared/styles.css">
</head>
<body>
  <div class="container" id="app"></div>
  <script src="../shared/changelog.js"></script>
  <script src="../shared/api.js"></script>
  <script src="../shared/core.js"></script>
  <script src="../shared/shell.js"></script>
  <script src="plan.js"></script>
  <script>init();</script>
</body>
</html>
```

### Step 8: Create `/rambam3/manifest.json` ✅ COMPLETE
- Copy from root `manifest.json`
- Update `start_url` to `/rambam3/`
- Update `scope` to `/rambam3/`
- Update icon paths to `../logo.png`, `../icon-192.png`, `../icon-512.png`

### Step 9: Create `/rambam3/service-worker.js` ✅ COMPLETE
- Hardcode version: `const VERSION = 1;` (or import from plan-specific version file)
- Cache name: `const CACHE_NAME = 'rambam3-v' + VERSION;`
- Cache list:
  - `./` (index.html)
  - `./plan.js`
  - `./manifest.json`
  - `../shared/styles.css`
  - `../shared/api.js`
  - `../shared/core.js`
  - `../shared/shell.js`
  - `../shared/changelog.js`
  - `../logo.png`
  - `../icon-192.png`
  - `../icon-512.png`
- Same fetch strategy as current: network-first for Sefaria API, cache-first for static

### Step 10: Migrate 3-chapter users (after verifying /rambam3/ works)

Add a migration script to the **top** of root `index.html`'s `<script>` block (line 1062), before any other code:

```js
// Migration: move 3-chapter users to /rambam3/
(function() {
  const chapters = localStorage.getItem('rambam_chapters');
  if (chapters === '1') return; // 1-chapter users stay on root app

  // Copy rambam_* keys to rambam3_* keys
  const keysToMigrate = ['days', 'done', 'start', 'auto_mark', 'hide_completed'];
  keysToMigrate.forEach(function(key) {
    var val = localStorage.getItem('rambam_' + key);
    if (val !== null) localStorage.setItem('rambam3_' + key, val);
  });

  // Redirect to new app
  window.location.replace('/rambam3/');
})();
```

This runs immediately — 3-chapter users (and new users with no `rambam_chapters` key) get their data copied to `rambam3_*` keys and are redirected to `/rambam3/`. 1-chapter users continue using the old root app unchanged.

**For installed PWA users:** Their app opens `/` → root service worker serves `index.html` → migration script runs → redirect to `/rambam3/`. The `/rambam3/` service worker takes over from there. On subsequent visits the redirect is fast (local).

## Key Design Decisions

- **`window.PLAN`** is set by each app's `plan.js` before `init()` runs
- **`plan.loadDay(date)`** returns `{ he, ref, count, heDate }` — day metadata
- **`plan.loadContent(date, ref)`** returns `{ chapters, chapterNumbers }` — card data for rendering
- **`core.js` handles all rendering** — calls plan methods, renders Day > Chapter > Cards UI
- **Shared settings** (auto-mark, hide-completed, sunset, location, start date) use unprefixed localStorage keys — shared across all plans on same origin
- **Plan data** uses `{storagePrefix}_days` and `{storagePrefix}_done` keys
- **`shell.js`** injects all HTML dynamically — one place to update header/footer/settings
- **No chapter count toggle** in settings — each plan is a separate app
- **Root app untouched** — existing users unaffected until explicit migration step (Step 10)
- **Images** referenced via `../` relative paths from `/rambam3/` to avoid duplication

## Future: Migration for 1-chapter users (separate task)

When `/rambam1/` is ready:
1. Update root migration script to also handle `rambam_chapters === '1'` → copy keys to `rambam1_*`, redirect to `/rambam1/`
2. Root `index.html` becomes a pure redirect page — all users go to their respective apps
3. Update root `service-worker.js` to just cache the redirect page

## Verification

1. Visit `/rambam3/` in browser — should look and behave identically to current root app
2. **Fresh state** — no localStorage data, first-visit flow works (opens settings)
3. Swipe to complete, double-tap, day actions all work
4. Settings panel opens — all toggles work, NO chapter count toggle
5. Calendar date picker works
6. PWA install prompt appears
7. Service worker registers and caches files correctly
8. Stats update correctly after marking halakhot
9. After Step 10: 3-chapter users at root get redirected to `/rambam3/` with data migrated
10. After Step 10: 1-chapter users at root continue to see old app unchanged
