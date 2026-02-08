# Flat-List Sections: Text Fetching & Sefaria Links

## Background

Mishneh Torah on Sefaria has two kinds of sections:

| Type | Structure | URL depth | Example |
|------|-----------|-----------|---------|
| **Regular chapters** | Book → Chapter → Halakha | 3-level: `Book.Chapter.Halakha` | `Laws_of_Fasting.1.4` |
| **Flat lists** (intro) | Book → Item | 2-level: `Book.Item` | `Negative_Mitzvot.42` |

The flat-list intro sections:

| Section | Total items | Notes |
|---------|-------------|-------|
| **Negative Mitzvot** | 370 | Schedule says 365 — missing 5-item afterword |
| **Positive Mitzvot** | 248 | Matches schedule exactly |
| **Transmission of the Oral Law** | 45 | Matches schedule exactly |

**Not flat-list:** "Overview of Mishneh Torah Contents" uses chaptered refs (`1:1-14:10`), not flat numbering.

---

## The Two Bugs

### Bug 1: Missing content (items 366–370 of Negative Mitzvot)

Both the Sefaria Calendar API and HebCal `@hebcal/learning` agree:

```
rambam3 Feb 5:  "Negative Mitzvot 1-365"
rambam1 Feb 11: "Negative Mitzvot 246-365"
```

This is the schedule definition itself capping at 365, not a Sefaria bug.
But Sefaria actually has **370 items**. Items 366–370 are an afterword about
rabbinic commandments — legitimate Rambam text that should be shown for
complete study in the rambam3 cycle.

When you pass the range-free ref to the Text API, it returns everything:

```
"Mishneh Torah, Negative Mitzvot"        → 370 items (complete)
"Mishneh Torah, Negative Mitzvot 1-365"  → 365 items (truncated)
```

### Bug 2: Broken Sefaria web links

The link builder (`sefariaHalakhaUrl`) always generated 3-level URLs:

```
Positive_Mitzvot.1.1   → 404 on Sefaria
```

But flat-list sections need 2-level URLs:

```
Positive_Mitzvot.1     → correct page
```

---

## Study Paths & How They Split Intro Sections

### rambam3 — "Daily Rambam (3 Chapters)"

Gets the entire flat-list section in one day:

| Date | Ref |
|------|-----|
| Feb 4 | `Positive Mitzvot 1-248` (all 248) |
| Feb 5 | `Negative Mitzvot 1-365` (should be 370) |
| Feb 6 | `Overview of Mishneh Torah Contents 1:1-14:10` (chaptered) |

### rambam1 — "Daily Rambam"

Splits flat-list sections across multiple days:

| Date | Ref |
|------|-----|
| Feb 3 | `Transmission of the Oral Law 1-21` |
| Feb 4 | `Transmission of the Oral Law 22-33` |
| Feb 5 | `Transmission of the Oral Law 34-45` |
| Feb 6 | `Positive Mitzvot 1-83` |
| Feb 7 | `Positive Mitzvot 84-166` |
| Feb 8 | `Positive Mitzvot 167-248` |
| Feb 9 | `Negative Mitzvot 1-122` |
| Feb 10 | `Negative Mitzvot 123-245` |
| Feb 11 | `Negative Mitzvot 246-365` |
| Feb 12 | `Overview... 1:1-4:8` (chaptered) |
| Feb 13 | `Overview... 5:1-9:9` (chaptered) |
| Feb 14 | `Overview... 10:1-14:10` (chaptered) |

### mitzvot — "Sefer HaMitzvot"

Uses completely different ref format — **no collision risk**:

```
Sefer HaMitzvot, Positive Commandments 3    ("Commandments" not "Mitzvot")
Sefer HaMitzvot, Negative Commandments 47   ("Commandments" not "Mitzvot")
Sefer HaMitzvot, Shorashim 1-3
```

---

## The Fix: `normalizeIntroRef()` + `sliceHalakhot()`

### Exception list approach

We maintain a simple exception list: `TRUNCATED_SECTIONS` maps section name →
the schedule's known wrong end number. When users report more inconsistencies,
add one line.

```ts
const TRUNCATED_SECTIONS: Record<string, number> = {
  "Negative Mitzvot": 365, // Sefaria has 370 — afterword about rabbinic commandments
};
```

### How it works

When a ref's range **ends at the truncated number** (regardless of start):

1. **Fetch** the full section (strip range) — cached in IndexedDB for all paths to share
2. **Slice** from the range start to the end of the actual content

This handles both rambam3 (full section) and rambam1's last chunk:

```
"Negative Mitzvot 1-365"   → end=365 ✓ → fetch all 370, slice [0..] = 370 items
"Negative Mitzvot 246-365" → end=365 ✓ → fetch all 370, slice [245..] = 125 items (246–370)
"Negative Mitzvot 1-122"   → end=122 ≠ 365 → fetch as-is, no slicing
"Negative Mitzvot 123-245" → end=245 ≠ 365 → fetch as-is, no slicing
```

### Safety matrix

| Ref | Path | end | Matches? | Fetch | Slice | Shows |
|-----|------|-----|----------|-------|-------|-------|
| `Negative Mitzvot 1-365` | rambam3 | 365 | ✓ | full section | `[0..]` | 370 items |
| `Negative Mitzvot 246-365` | rambam1 | 365 | ✓ | full section (cache hit) | `[245..]` | 125 items (246–370) |
| `Negative Mitzvot 1-122` | rambam1 | 122 | ✗ | `1-122` as-is | none | 122 items |
| `Negative Mitzvot 123-245` | rambam1 | 245 | ✗ | `123-245` as-is | none | 123 items |
| `Positive Mitzvot 1-248` | rambam3 | — | not in TRUNCATED_SECTIONS | as-is | none | 248 items |
| `Positive Mitzvot 1-83` | rambam1 | — | not in TRUNCATED_SECTIONS | as-is | none | 83 items |
| `Transmission... 1-21` | rambam1 | — | not in TRUNCATED_SECTIONS | as-is | none | 21 items |
| `Overview... 1:1-14:10` | both | — | regex no match (colons) | as-is | none | unchanged |
| `Human Dispositions 1-3` | both | — | not in TRUNCATED_SECTIONS | as-is | none | unchanged |
| `Sefer HaMitzvot, Positive Commandments 3` | mitzvot | — | "Commandments" ≠ "Mitzvot" | as-is | none | unchanged |
| `Sefer HaMitzvot, Negative Commandments 47` | mitzvot | — | "Commandments" ≠ "Mitzvot" | as-is | none | unchanged |

### Cache sharing

All refs that match the same section share one IndexedDB cache entry (keyed by
the range-stripped ref). For Negative Mitzvot, both rambam3 `1-365` and rambam1
`246-365` hit the same cache — the full 370 items are fetched once.

### Adding new exceptions

If users report missing content in another section, add one line to `TRUNCATED_SECTIONS`
in `src/services/sefaria.ts`:

```ts
const TRUNCATED_SECTIONS: Record<string, number> = {
  "Negative Mitzvot": 365,
  "Some Other Section": 42, // ← add the schedule's wrong end number
};
```

### Where normalization is applied

All functions that touch the IndexedDB cache or network use the normalized key.
Only `fetchHalakhot()` applies slicing (the others just need the cache key):

- `fetchHalakhot()` — fetch + slice to range
- `prefetchText()` — fetch + cache (no slicing, just warming the cache)
- `isTextCached()` — cache lookup
- `isTextCachedAndFresh()` — freshness check

---

## Data Flow

### Step 1: Calendar API (schedule lookup)

```
GET https://www.sefaria.org/api/calendars?day=5&month=2&year=2026
```

Response (simplified):

```json
{
  "calendar_items": [
    {
      "title": { "en": "Daily Rambam (3 Chapters)" },
      "displayValue": { "en": "Negative Mitzvot 1-365" },
      "ref": "Mishneh Torah, Negative Mitzvot 1-365"
    },
    {
      "title": { "en": "Daily Rambam" },
      "displayValue": { "en": "Transmission of the Oral Law 34-45" },
      "ref": "Mishneh Torah, Transmission of the Oral Law 34-45"
    }
  ]
}
```

The code filters by `title.en` matching the study path:

| Path | Calendar name |
|------|---------------|
| `rambam3` | `"Daily Rambam (3 Chapters)"` |
| `rambam1` | `"Daily Rambam"` |
| `mitzvot` | computed locally via `@hebcal/learning` (no API call) |

The `ref` field is stored in Zustand as `dayData.ref` — unchanged.

### Step 2: Ref normalization (text fetch only)

`normalizeIntroRef()` runs before the Text API call and cache lookup.
Only triggers for full-section refs (see safety matrix above).

```
"Mishneh Torah, Negative Mitzvot 1-365"  →  "Mishneh Torah, Negative Mitzvot"
"Mishneh Torah, Positive Mitzvot 84-166" →  unchanged (rambam1 partial)
```

### Step 3: Text API (content fetch)

Two parallel requests (Hebrew and English independently via `Promise.allSettled`):

```
GET sefaria.org/api/v3/texts/Mishneh%20Torah%2C%20Negative%20Mitzvot?version=hebrew
GET sefaria.org/api/v3/texts/Mishneh%20Torah%2C%20Negative%20Mitzvot?version=english
```

Response is a flat `string[]` (no nesting — flat list, not chapters):

```json
{
  "versions": [{ "text": ["<p>Item 1...</p>", "...", "...370 items total..."] }],
  "isSpanning": false
}
```

Cached in IndexedDB under the **normalized** ref key.

### Step 4: Web link generation

`sefariaHalakhaUrl()` uses the **original** ref from `dayData.ref` (still has range).

Regex parses `"Mishneh Torah, Negative Mitzvot 1-365"`:

```
match[1] = "Mishneh Torah, Negative Mitzvot"  (book name)
match[2] = "1"                                 (start number)
match[3] = "365"                               (end number — range exists)
```

**Flat-list detection**: `match[3]` exists AND no `chapterBreaks` → 2-level URL.

```
itemNum = startNumber + halakhaIndex

Index 0   →  sefaria.org/Mishneh_Torah,_Negative_Mitzvot.1?lang=bi
Index 41  →  sefaria.org/Mishneh_Torah,_Negative_Mitzvot.42?lang=bi
Index 369 →  sefaria.org/Mishneh_Torah,_Negative_Mitzvot.370?lang=bi
```

**Discriminator table:**

| Ref | `match[3]` | `chapterBreaks` | URL type |
|-----|------------|-----------------|----------|
| `Negative Mitzvot 1-365` | `"365"` | `[]` | Flat → 2-level |
| `Positive Mitzvot 84-166` | `"166"` | `[]` | Flat → 2-level |
| `Human Dispositions 1-3` | `"3"` | `[23, 43]` | Chaptered → 3-level |
| `Laws of Fasting 1` | `undefined` | `[]` | Single chapter → 3-level |

---

## URL Examples (before → after)

### Flat-list sections (fixed)

```
BEFORE:  sefaria.org/Mishneh_Torah,_Negative_Mitzvot.1.1?lang=bi     → 404
AFTER:   sefaria.org/Mishneh_Torah,_Negative_Mitzvot.1?lang=bi       → correct

BEFORE:  sefaria.org/Mishneh_Torah,_Positive_Mitzvot.1.42?lang=bi    → 404
AFTER:   sefaria.org/Mishneh_Torah,_Positive_Mitzvot.42?lang=bi      → correct
```

### Regular chapters (unchanged)

```
sefaria.org/Mishneh_Torah,_Human_Dispositions.1.6?lang=bi            → correct
sefaria.org/Mishneh_Torah,_Laws_of_Fasting.1.4?lang=bi               → correct
```

---

## Data Sources Compared

Both the Sefaria Calendar API and HebCal `@hebcal/learning` return identical
refs for these sections. The 1-365 cap on Negative Mitzvot is in the schedule
definition itself, not a Sefaria-specific issue.

| Source | rambam3 Neg. Mitzvot | rambam1 Neg. Mitzvot day 3 | rambam3 Overview |
|--------|---------------------|-----------------------------|-----------------|
| Sefaria Calendar API | `1-365` | `246-365` | `1-14` |
| HebCal `@hebcal/learning` | `1-365` | `246-365` | `1:1-14:10` |

The app currently uses Sefaria Calendar API for rambam1/rambam3 schedules
and HebCal only for Sefer HaMitzvot (computed locally, no network).

---

## Files Modified

| File | Change |
|------|--------|
| `src/services/sefaria.ts` | Added `TRUNCATED_SECTIONS` exception list and `normalizeIntroRef()`. Applied in `fetchHalakhot`, `prefetchText`, `isTextCached`, `isTextCachedAndFresh`. |
| `src/lib/externalLinks.ts` | Added flat-list branch in `sefariaHalakhaUrl()` — generates 2-level URLs when range ref has no chapter breaks. |
