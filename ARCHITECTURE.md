# Architecture Guide

## Overview

This project hosts multiple independent Jewish daily study tracking apps that share common code. Each "plan" is a separate app (its own `index.html`, `plan.js`, `manifest.json`, `service-worker.js`) that uses shared utilities for UI, rendering, and API access.

Users learning different plans (3-chapter Rambam, 1-chapter Rambam, Sefer HaMitzvot, etc.) visit different URLs. Each app is self-contained, installable as a separate PWA, with its own progress tracking.

## File Structure

```
/shared/                    ← Shared code used by all plans
  styles.css                ← All CSS
  shell.js                  ← Injects shared HTML (header, stats, settings panel, footer)
  core.js                   ← Rendering, swipe, stats, date utils, localStorage, init()
  api.js                    ← Sefaria, Hebcal, BigDataCloud API functions
  changelog.js              ← Version changelog data

/assets/                    ← Shared images used by all plans
  logo.png                  ← App logo
  icon-192.png              ← PWA icon 192x192
  icon-512.png              ← PWA icon 512x512
  favicon.ico               ← Browser favicon
  claude.jpeg               ← Claude Code badge in footer
  rabbi.jpeg                ← Rabbi avatar in footer

/rambam3/                   ← Rambam 3 Chapters app
  index.html                ← Minimal HTML shell, loads shared + plan.js
  plan.js                   ← Plan config and data loading functions
  manifest.json             ← PWA manifest
  service-worker.js         ← Offline caching
  shared/ → ../shared       ← Symlink to shared code (gitignored)
  assets/ → ../assets       ← Symlink to shared images (gitignored)

/rambam1/                   ← Rambam 1 Chapter app (future)
  index.html, plan.js, manifest.json, service-worker.js
  shared/ → ../shared       ← Symlink (gitignored)
  assets/ → ../assets       ← Symlink (gitignored)

/mitzvot/                   ← Sefer HaMitzvot app (future)
  index.html, plan.js, mitzvot.js, manifest.json, service-worker.js
  shared/ → ../shared       ← Symlink (gitignored)
  assets/ → ../assets       ← Symlink (gitignored)

/ (root)                    ← Legacy redirect page (optional, for backward compat)
  index.html                ← Redirects existing users to new URLs based on rambam_chapters
  changelog.js              ← (kept for backward compat with old service worker)
  manifest.json, service-worker.js ← (legacy)
  logo.png, icon-*.png      ← (legacy, kept for old root app)
  .gitignore                ← Ignores symlinks in app folders
  package.json              ← Build and setup scripts for local dev + Cloudflare
  PLAN.md                   ← Implementation plan
  ARCHITECTURE.md           ← This file
```

## How Plans Work

Each plan is defined in a `plan.js` file that sets `window.PLAN`:

```js
window.PLAN = {
  id: 'rambam3',              // Unique plan identifier
  name: 'רמב"ם יומי',          // Display name (shown in header)
  storagePrefix: 'rambam3',   // localStorage key prefix for plan data

  // Load metadata for a single day (called during loadMissingDays)
  async loadDay(date) {
    // Returns: { he, ref, count, heDate }
    // - he: Hebrew display name (e.g. "הלכות יסודי התורה פרקים א-ג")
    // - ref: reference string for loadContent (e.g. Sefaria ref or "mitzvot-day-5")
    // - count: total number of items (halakhot/mitzvot) for completion tracking
    // - heDate: Hebrew date string (optional)
  },

  // Load card content when a day is expanded (lazy loaded)
  async loadContent(date, ref) {
    // Returns: { chapters, chapterNumbers }
    // - chapters: array of arrays, each inner array = one chapter's items (HTML strings)
    // - chapterNumbers: array of chapter numbers (for Hebrew letter labels)
    // If only one chapter, chapters = [[item1, item2, ...]], chapterNumbers = [1]
  }
};
```

The plan's `loadDay()` and `loadContent()` methods abstract away the data source (Sefaria API, static JSON, future sources). The shared `core.js` calls these methods and renders everything using a uniform Day > Chapter > Swipeable Cards UI.

## Adding a New Plan

1. **Create a new directory** (e.g. `/chumash/`)

2. **Create `plan.js`** with `window.PLAN = { ... }` following the interface above:
   ```js
   window.PLAN = {
     id: 'chumash',
     name: 'חומש יומי',
     storagePrefix: 'chumash',
     async loadDay(date) { /* fetch from API or static data */ },
     async loadContent(date, ref) { /* return chapters/items */ }
   };
   ```

3. **Create `index.html`** — copy from `/rambam3/index.html`, update:
   - `<title>` and `<meta name="description">`
   - Paths to shared files use `./shared/...` (not `../`)
   - Icon path uses `./assets/favicon.ico`
   - Add any plan-specific scripts (e.g. static data files)

4. **Create `manifest.json`** — copy from `/rambam3/manifest.json`, update:
   - `name`, `short_name` — plan display name
   - `start_url` — `/chumash/`
   - `scope` — `/chumash/`
   - Icon paths — `./assets/logo.png`, `./assets/icon-192.png`, `./assets/icon-512.png`

5. **Create `service-worker.js`** — copy from `/rambam3/service-worker.js`, update:
   - Cache list to include plan-specific files
   - Verify `importScripts('./shared/changelog.js')` path is correct
   - Icon paths use `./assets/*`

6. **If plan has static data** (like `mitzvot.js`), add a `<script src="data.js">` tag in `index.html` before `plan.js`

7. **Setup symlinks for local dev**:
   ```sh
   npm run setup:chumash
   ```

8. **Add build script to package.json**:
   ```json
   "build:chumash": "mkdir -p chumash/shared chumash/assets && cp -r shared/* chumash/shared/ && cp -r assets/* chumash/assets/",
   "setup:chumash": "cd chumash && ln -sf ../shared shared && ln -sf ../assets assets"
   ```

9. **Add symlinks to .gitignore**:
   ```
   chumash/shared
   chumash/assets
   ```

10. **Test locally** — open `chumash/index.html` in browser, verify all functionality

11. **Deploy** — Create new Cloudflare Pages project:
    - Build command: `npm run build:chumash`
    - Build output: `chumash`
    - Watch paths: `shared/*`, `assets/*`, `chumash/*`

## Shared Code Details

### shell.js
- `TOGGLE_SETTINGS` — config array defining all toggle settings (auto-mark, hide-completed-items, hide-completed-days)
  - Each toggle config includes: `id`, `label`, `trueLabel`, `falseLabel`, `getter`, `setter`, optional `sideEffect`
  - Config-driven approach eliminates code duplication and makes adding new toggles trivial
- `generateToggleSettings()` — dynamically generates HTML for all toggle settings from config
- `attachToggleListeners()` — generic event listener that handles all toggle logic (initial state, clicks, storage, side effects)
- `initShell()` — injects all HTML structure into `#app` container
- Reads `window.PLAN.name` for header title
- Creates header, stats bar, progress bar, main content area, settings panel, footer
- Attaches event listeners for settings toggles, install prompt, calendar picker
- **Note**: No chapter count toggle — each plan is a separate app

### core.js
- `getSetting(key, defaultValue)` / `setSetting(key, value)` — generic localStorage utilities for boolean settings
- Specific setting wrappers: `getAutoMark()`, `setAutoMark()`, `getHideCompleted()`, `setHideCompleted()`, `getHideCompletedDays()`, `setHideCompletedDays()`
- `init()` — main entry point called from each app's `index.html`
- Reads `window.PLAN.storagePrefix` for all localStorage operations
- Calls `window.PLAN.loadDay(date)` to fetch day metadata
- Calls `window.PLAN.loadContent(date, ref)` to fetch card content
- Renders day groups, chapter dividers, halakha cards
- Manages swipe gestures (right = mark done, left = unmark, double-tap = toggle)
- Handles completion tracking, stats computation, scroll progress
- Auto-opens today's section and scrolls to first incomplete item

### api.js
- Pure API functions, no DOM manipulation
- `fetchCalendar(date, sefariaTitle)` — fetches daily study from Sefaria calendar API
- `fetchText(ref)` — fetches halakha text from Sefaria, handles multi-chapter refs, caches in memory
- `fetchSunset(dateStr, coords)` — fetches sunset time from Hebcal Zmanim API
- `fetchHebrewDate(dateStr)` — converts Gregorian to Hebrew date via Hebcal
- `fetchLocationName(coords)` — reverse geocodes coordinates to Hebrew city name
- `updateLocationDisplay()` — updates settings panel location/sunset display

### styles.css
- All CSS for the entire app (no inline styles)
- Mobile-first, RTL, Hebrew typography
- Uses Noto Sans Hebrew from Google Fonts
- Swipeable card styles with smooth transitions
- Settings panel slide-in animation
- Progressive disclosure (chapter dividers, completed counters)
- Scroll progress bar

## localStorage Keys

### Shared (no prefix, same across all plans on same origin)
- `rambam_start` — cycle start date (shared by all plans that use a fixed start date)
- `rambam_auto_mark` — auto-mark previous items when marking later ones (boolean, default: true)
- `rambam_hide_completed` — hide completed halakhot/items within days (boolean, default: true)
- `rambam_hide_completed_days` — hide entire completed days (boolean, default: true)
- `install_prompt_shown` — PWA install prompt dismissed (boolean)
- `rambam_chapters` — legacy key from old app (`1` or `3`), used only for migration

### Per-plan (prefixed with plan's storagePrefix)
- `{prefix}_days` — cached day metadata: `{ "2026-02-03": { he, ref, count, heDate }, ... }` (JSON)
- `{prefix}_done` — completion records: `{ "2026-02-03:0": "2026-02-03T18:30:00Z", ... }` (JSON)
  - Keys are `{date}:{index}`, values are ISO timestamps of when marked complete

**Example**: A user learning rambam3 has keys like `rambam3_days`, `rambam3_done`, `rambam_start`, `rambam_auto_mark`.

**Migration note**: The root redirect script copies `rambam_*` keys to `rambam3_*` or `rambam1_*` based on the user's `rambam_chapters` value, ensuring existing users' progress is preserved.

## Versioning Strategy

**Plan versions are completely independent:**

- Each plan has its own version number hardcoded in `service-worker.js`
- Plans can be at different versions (rambam3 v12, rambam1 v5, mitzvot v2)
- Incrementing one plan's version does NOT affect other plans
- You only redeploy/update plans that need changes

**The shared `changelog.js` file:**
- Used ONLY for displaying release notes in the settings panel
- NOT used for cache versioning
- Think of it as documentation/user-facing release notes
- Can be updated independently without triggering cache busts

**Example scenario:**
1. You fix a bug in `shared/core.js` that only affects date calculations
2. You decide `rambam3` needs the fix urgently, but `mitzvot` doesn't use date calculations
3. Increment `VERSION` in `rambam3/service-worker.js` from 12 to 13
4. Redeploy only `rambam3.pages.dev`
5. `rambam3` users get the update, `mitzvot` users stay on their current version
6. Later, you increment `mitzvot` version for a different reason

This gives you fine-grained control over which users get updates when, without forcing everyone to update simultaneously.

## Deployment

Each plan is deployed as a **separate Cloudflare Pages project** with its own URL:
- `rambam3.pages.dev` (or custom domain like `rambam3.yourdomain.com`)
- `rambam1.pages.dev`
- `mitzvot.pages.dev`
- etc.

### Deployment Setup (per plan)

Each plan uses **symlinks locally** and a **build command on Cloudflare** to create a self-contained deployment.

**Cloudflare Pages config** (example for rambam3):
- **Build command**: `npm run build:rambam3`
- **Build output**: `rambam3`
- **Watch paths**: `shared/*`, `assets/*`, `rambam3/*`

**Local development setup** (one-time per plan):
```sh
npm run setup:rambam3
```

This creates symlinks `rambam3/shared → ../shared` and `rambam3/assets → ../assets` so you can open `rambam3/index.html` directly in a browser without any server. The symlinks are gitignored.

**Build script** (in package.json):
```json
{
  "scripts": {
    "build:rambam3": "mkdir -p rambam3/shared rambam3/assets && cp -r shared/* rambam3/shared/ && cp -r assets/* rambam3/assets/",
    "setup:rambam3": "cd rambam3 && ln -sf ../shared shared && ln -sf ../assets assets"
  }
}
```

The build command copies real files into the plan directory, replacing the symlinks for Cloudflare deployment.

### Paths in Code

All paths use **relative `./` syntax**, which works for both symlinks (local dev) and copied files (Cloudflare):

```html
<!-- In rambam3/index.html -->
<link rel="stylesheet" href="./shared/styles.css">
<link rel="icon" href="./assets/favicon.ico">
```

```js
// In rambam3/service-worker.js
importScripts('./shared/changelog.js');
```

### Implications

- **Each app is fully independent** — deploy, update, and scale separately
- **Clean URLs** — `rambam3.pages.dev/` (no /rambam3/ in the URL)
- **No access to other apps' files** — each deployment is isolated
- **Symlinks for local dev** — no build step needed locally, just open the HTML file
- **One-line build command** — Cloudflare copies shared files at deploy time
- **Trade-off**: A change to `/shared/` or `/assets/` requires redeploying all affected plans

### Root Deployment

The root `/` can optionally remain deployed as a redirect/migration page for backward compatibility with existing users who have the old URL bookmarked or installed as PWA.

## Service Worker

Each plan has its own `service-worker.js` with **independent versioning**:

```js
// rambam3/service-worker.js
const VERSION = 12;  // This plan is on version 12
const CACHE_NAME = 'rambam3-v12';

// rambam1/service-worker.js
const VERSION = 5;   // This plan is on version 5
const CACHE_NAME = 'rambam1-v5';
```

### Version Management Strategy

- **Plan versions are independent** — each plan increments its own version when deployed
- **No shared version dependency** — `rambam3` at v12, `rambam1` at v5, `mitzvot` at v2 is perfectly fine
- **Shared `changelog.js` is for display only** — shown in settings panel as release notes, NOT used for cache versioning
- **When to increment a plan's version:**
  - Changed that plan's `plan.js`
  - Changed any shared file (`core.js`, `shell.js`, `api.js`, `styles.css`) and want to bust cache
  - Fixed a bug in that plan
  - Want to force all users of that plan to refresh

### Service Worker Features

- Cache name format: `{planId}-v{version}` (e.g. `rambam3-v12`)
- Pre-caches static assets: index.html, plan.js, manifest.json, shared/*.js/css, images
- **Fetch strategy**:
  - Sefaria API (`https://www.sefaria.org`) — network-first with cache fallback (offline support)
  - Hebcal API (`https://www.hebcal.com`) — network-first with cache fallback
  - BigDataCloud API — network-first with cache fallback
  - Static assets — cache-first with network fallback
- Handles `SKIP_WAITING` messages for seamless updates
- Cleans up old caches on activation

**When adding new shared files**, update the cache list in **each** plan's `service-worker.js`.

**When updating a plan**: Increment `VERSION` in its `service-worker.js` to bust the cache for that plan only.

## User Flow

### New User
1. Visits `rambam3.pages.dev` directly
2. First visit flag triggers → settings panel opens automatically
3. User can configure start date, location, preferences
4. User marks halakhot by swiping right or double-tapping
5. Service worker caches everything — app works offline

### Existing User (3 Chapters) — Migration from Old App
1. Has `rambam_chapters = 3` or unset in localStorage on old URL
2. Visits old root URL → redirect script copies `rambam_*` keys to `rambam3_*` → redirects to `rambam3.pages.dev`
3. Their progress loads from `rambam3_days` and `rambam3_done` keys
4. App continues where they left off

### Existing User (1 Chapter) — Migration from Old App
1. Has `rambam_chapters = 1` in localStorage on old URL
2. Visits old root URL → redirect script detects `1` → old app loads (until rambam1 is built)
3. Once `rambam1.pages.dev` is ready, redirect script copies `rambam_*` keys to `rambam1_*` → redirects to `rambam1.pages.dev`

### Installed PWA User (Legacy)
1. Opens installed app (old URL) → launches root `/`
2. Root service worker serves `index.html`
3. Migration script runs → redirects to appropriate plan app's new URL
4. New plan's service worker takes over
5. They should reinstall the PWA from the new URL for full offline support

## Common Modifications

### Add a new toggle setting
1. Add getter/setter functions in `core.js`:
   ```javascript
   function getNewSetting() {
     return getSetting('rambam_new_setting', true);
   }
   function setNewSetting(enabled) {
     setSetting('rambam_new_setting', enabled);
   }
   ```
2. Add entry to `TOGGLE_SETTINGS` array in `shell.js`:
   ```javascript
   {
     id: 'new-setting',
     label: 'תיאור ההגדרה',
     trueLabel: 'כן',
     falseLabel: 'לא',
     getter: getNewSetting,
     setter: setNewSetting,
     sideEffect: (newValue) => { /* optional side effect */ }
   }
   ```
3. That's it! The config-driven system handles HTML generation and event listeners automatically

### Add a non-toggle setting
1. Add HTML manually to settings panel in `shell.js`
2. Add event listener in `attachSettingsListeners()`
3. Add localStorage getter/setter in `core.js` if needed
4. Use the setting value in relevant logic

### Change header/footer
1. Edit `shell.js` `initShell()` function
2. One change updates all plans

### Add a new API source
1. Add fetch function to `api.js`
2. Call it from plan's `loadDay()` or `loadContent()` method

### Update cache version (trigger app update)
1. Edit the plan's `service-worker.js` and increment `VERSION` (e.g. change `const VERSION = 12;` to `const VERSION = 13;`)
2. Redeploy that specific plan to Cloudflare Pages
3. Users get update prompt on next visit to that plan

**Example workflow:**
- You fix a bug in `shared/core.js`
- You decide which plans need the fix (maybe all, maybe just `rambam3`)
- Increment `VERSION` in each affected plan's `service-worker.js`
- Redeploy those plans
- Other plans remain on their current version until you explicitly update them

**About the shared changelog:**
- `shared/changelog.js` is purely for displaying release notes in the settings panel
- It does NOT control cache versioning
- You can update it independently of plan versions
- Think of it as documentation, not infrastructure

## Testing Checklist

For each new plan:
- [ ] Fresh install works (no localStorage)
- [ ] First-visit flow (settings panel opens)
- [ ] Day data loads correctly
- [ ] Cards render correctly with chapter dividers
- [ ] Swipe right marks complete
- [ ] Swipe left unmarks (if completed)
- [ ] Double-tap toggles completion
- [ ] Auto-mark previous items works (if enabled)
- [ ] Stats update correctly (completed days, today %, backlog)
- [ ] Calendar date picker works
- [ ] Settings toggles persist
- [ ] PWA install prompt appears
- [ ] Service worker caches files
- [ ] App works offline after first visit
- [ ] Progress persists across sessions
- [ ] Shared settings (auto-mark, hide-completed) work across plans on same origin
