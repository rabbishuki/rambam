/**
 * Sefaria API service with local-first data access
 * Data is stored in IndexedDB first, network is used only when needed
 *
 * Schedule sources:
 * - Rambam 1 & 3 chapters: Sefaria Calendar API (refs guaranteed to match text API)
 * - Sefer HaMitzvot: computed locally via @hebcal/learning (no network)
 * - Hebrew dates: computed locally via @hebcal/core (no network)
 *
 * Text fetching:
 * - Hebrew and English fetched independently via Promise.allSettled
 * - Neither language is individually fatal — only throws if BOTH fail
 * - Returns languagesLoaded to indicate which languages were successfully fetched
 */

import type { StudyPath, DayData, HalakhaText } from "@/types";
import { SEFARIA_CALENDAR_NAMES } from "@/types";
import {
  getTextFromDB,
  saveTextToDB,
  getCalendarFromDB,
  saveCalendarToDB,
  isStale,
} from "./database";
import { isReachable } from "./connectivity";
import { resolveMitzvotSchedule, computeHebrewDate } from "./studySchedule";

const SEFARIA_API = "https://www.sefaria.org";

// Staleness threshold in days
const TEXT_STALE_DAYS = 7; // Texts rarely change
const CALENDAR_STALE_DAYS = 1; // Calendar data should be refreshed daily

/**
 * Sections where the study schedule truncates content that Sefaria actually has.
 * Maps section name → the schedule's known wrong end number.
 *
 * When a ref's range ends at the truncated number, we fetch the full section and
 * slice from the range start. This handles both rambam3 (full section in one day)
 * and rambam1's last chunk (e.g., "246-365" gets extended to include 366-370).
 *
 * Add new entries here as users report missing content.
 * See docs/flat-list-sections.md for full details.
 */
const TRUNCATED_SECTIONS: Record<string, number> = {
  "Negative Mitzvot": 365, // Sefaria has 370 — afterword about rabbinic commandments
};

interface NormalizedRef {
  /** The ref to use for fetching/caching (range stripped for truncated sections) */
  fetchRef: string;
  /** 0-based start index to slice results from (undefined = no slicing) */
  sliceStart?: number;
}

/**
 * Detect refs where the schedule truncates content and return fetch + slice info.
 *
 * "Negative Mitzvot 1-365"   → fetchRef: stripped, sliceStart: 0   (all 370)
 * "Negative Mitzvot 246-365" → fetchRef: stripped, sliceStart: 245 (246-370)
 * "Negative Mitzvot 1-122"   → fetchRef: unchanged                (end ≠ 365)
 */
function normalizeIntroRef(ref: string): NormalizedRef {
  for (const [section, truncatedEnd] of Object.entries(TRUNCATED_SECTIONS)) {
    if (!ref.includes(section)) continue;

    const rangeMatch = ref.match(/\s+(\d+)(?:-(\d+))?$/);
    if (!rangeMatch) continue;

    const start = parseInt(rangeMatch[1], 10);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;

    if (end === truncatedEnd) {
      return {
        fetchRef: ref.replace(/\s+\d+(?:-\d+)?$/, ""),
        sliceStart: start - 1,
      };
    }
  }
  return { fetchRef: ref };
}

/**
 * Slice halakhot to a sub-range when we fetched a full section but only need
 * part of it (e.g., rambam1 "Negative Mitzvot 246-365" from the full 370).
 * No-op when sliceStart is undefined (non-truncated refs) or 0 (full section).
 */
function sliceHalakhot(
  result: {
    halakhot: HalakhaText[];
    chapterBreaks: number[];
    languagesLoaded: LanguagesLoaded;
  },
  sliceStart?: number,
): {
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  languagesLoaded: LanguagesLoaded;
} {
  if (sliceStart === undefined || sliceStart === 0) return result;
  return {
    halakhot: result.halakhot.slice(sliceStart),
    // chapterBreaks are irrelevant for flat-list sections (always empty)
    chapterBreaks: [],
    languagesLoaded: result.languagesLoaded,
  };
}

interface SefariaCalendarItem {
  title: {
    en: string;
    he: string;
  };
  displayValue: {
    en: string;
    he: string;
  };
  ref: string;
}

interface SefariaCalendarResponse {
  calendar_items: SefariaCalendarItem[];
}

interface SefariaTextVersion {
  text: string | string[] | string[][];
}

interface SefariaTextResponse {
  versions: SefariaTextVersion[];
  isSpanning?: boolean;
}

// Language loading status — indicates which languages were successfully fetched
export interface LanguagesLoaded {
  he: boolean;
  en: boolean;
}

// Connectivity check is now handled by ./connectivity.ts (isReachable)

/**
 * Fetch Sefaria calendar for Rambam paths (with local-first caching)
 * Hebrew dates are always computed locally (no HebCal API needed)
 */
async function fetchSefariaCalendar(
  dateStr: string,
  path: StudyPath,
): Promise<Pick<DayData, "he" | "en" | "ref" | "heDate" | "enDate">> {
  // Compute Hebrew dates locally (always available, no network)
  const { heDate, enDate } = computeHebrewDate(dateStr);

  // Check IndexedDB first
  const cached = await getCalendarFromDB(path, dateStr);
  if (cached && !isStale(cached.fetchedAt, CALENDAR_STALE_DAYS)) {
    return {
      he: cached.he,
      en: cached.en,
      ref: cached.ref,
      heDate,
      enDate,
    };
  }

  // If offline, return stale cache if available
  if (!(await isReachable())) {
    if (cached) {
      return {
        he: cached.he,
        en: cached.en,
        ref: cached.ref,
        heDate,
        enDate,
      };
    }
    throw new Error("Offline and no cached data available");
  }

  // Fetch from network
  const [y, m, d] = dateStr.split("-").map(Number);
  const url = `${SEFARIA_API}/api/calendars?day=${d}&month=${m}&year=${y}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (cached) {
      return {
        he: cached.he,
        en: cached.en,
        ref: cached.ref,
        heDate,
        enDate,
      };
    }
    throw new Error(`Calendar API failed: ${res.status}`);
  }

  const data: SefariaCalendarResponse = await res.json();
  const calendarName = SEFARIA_CALENDAR_NAMES[path];

  const entry = data.calendar_items.find(
    (item) => item.title.en === calendarName,
  );

  if (!entry) {
    throw new Error(`No ${calendarName} entry found for ${dateStr}`);
  }

  const result = {
    he: entry.displayValue.he,
    en: entry.displayValue.en,
    ref: entry.ref,
    heDate,
    enDate,
  };

  // Save to IndexedDB
  saveCalendarToDB(path, dateStr, {
    he: result.he,
    en: result.en,
    ref: result.ref,
    count: 0,
    heDate,
    enDate,
  }).catch((err) => console.error("Failed to cache calendar:", err));

  return result;
}

/**
 * Fetch the daily calendar entry (local-first)
 *
 * - Rambam 1 & 3: Sefaria Calendar API (refs match text API)
 * - Sefer HaMitzvot: computed locally via @hebcal/learning
 * - Hebrew dates: always computed locally via @hebcal/core
 *
 * @param dateStr - Date string (YYYY-MM-DD)
 * @param path - Study path (rambam3, rambam1, or mitzvot)
 * @returns Day data with Hebrew/English display text and reference
 */
export async function fetchCalendar(
  dateStr: string,
  path: StudyPath,
): Promise<
  Pick<DayData, "he" | "en" | "ref" | "heDate" | "enDate"> & {
    refs?: string[];
  }
> {
  // Decision: Sefer HaMitzvot is computed locally via @hebcal/learning because
  // HebCal's API was the only source and we can eliminate that network dependency.
  // The local computation is deterministic and always available offline.
  if (path === "mitzvot") {
    return resolveMitzvotSchedule(dateStr);
  }

  // Decision: Rambam 1 & 3 still use Sefaria Calendar API because the refs it
  // returns are guaranteed to match the Sefaria Text API. Using @hebcal/learning
  // for Rambam would require constructing refs manually, risking mismatches.
  return fetchSefariaCalendar(dateStr, path);
}

/**
 * Process raw Sefaria text response into halakhot array.
 * Either source (Hebrew or English) can be null — uses whichever is available.
 *
 * Decision: Accepts nullable params so we can decouple Hebrew/English failures.
 * Sefaria v3 API returns different structures per language version, so we fetch
 * them separately and merge here. The "structural basis" (array shape) comes from
 * whichever response succeeded — both have identical structure, just different text.
 */
function processTextResponse(
  heData: SefariaTextResponse | null,
  enData: SefariaTextResponse | null,
): { halakhot: HalakhaText[]; chapterBreaks: number[] } {
  const halakhot: HalakhaText[] = [];
  const chapterBreaks: number[] = [];

  // Use whichever response is available as the structural basis
  const structuralData = heData ?? enData;
  if (!structuralData) {
    return { halakhot, chapterBreaks };
  }

  const heText = heData?.versions[0]?.text;
  const enText = enData?.versions[0]?.text;

  if (structuralData.isSpanning) {
    // Multiple chapters - text is array of arrays
    let currentIndex = 0;
    const structChapters = (heText ?? enText) as string[][];
    const heChapters = heText as string[][] | undefined;
    const enChapters = enText as string[][] | undefined;

    structChapters.forEach((chapter, chapterNum) => {
      if (chapterNum > 0) {
        chapterBreaks.push(currentIndex);
      }

      chapter.forEach((_, idx) => {
        halakhot.push({
          he: heChapters?.[chapterNum]?.[idx] ?? "",
          en: enChapters?.[chapterNum]?.[idx],
          chapter: chapterNum + 1,
          isFirstInChapter: idx === 0,
        });
        currentIndex++;
      });
    });
  } else if (Array.isArray(structuralData.versions[0]?.text)) {
    // Single chapter - text is flat array
    const structArray = (heText ?? enText) as string[];
    const heArray = heText as string[] | undefined;
    const enArray = enText as string[] | undefined;

    structArray.forEach((_, idx) => {
      halakhot.push({
        he: heArray?.[idx] ?? "",
        en: enArray?.[idx],
        chapter: 1,
        isFirstInChapter: idx === 0,
      });
    });
  } else {
    // Single halakha - text is string
    halakhot.push({
      he: (heText as string) ?? "",
      en: enText as string | undefined,
      chapter: 1,
      isFirstInChapter: true,
    });
  }

  return { halakhot, chapterBreaks };
}

/**
 * Fetch halakha text directly from network (bypasses cache)
 * Hebrew and English are fetched independently via Promise.allSettled:
 * - Neither is individually fatal — only throws if BOTH fail
 * - Returns languagesLoaded to indicate which succeeded
 */
async function fetchHalakhotFromNetwork(ref: string): Promise<{
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  languagesLoaded: LanguagesLoaded;
}> {
  const heUrl = `${SEFARIA_API}/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew`;
  const enUrl = `${SEFARIA_API}/api/v3/texts/${encodeURIComponent(ref)}?version=english`;

  // Decision: Promise.allSettled (not Promise.all) because we want partial success.
  // Many Sefaria texts lack English translations — that shouldn't block Hebrew display.
  // Only if BOTH fail do we throw an error.
  const [heResult, enResult] = await Promise.allSettled([
    fetch(heUrl).then(async (res) => {
      if (!res.ok) throw new Error(`Hebrew fetch failed: ${res.status}`);
      return res.json() as Promise<SefariaTextResponse>;
    }),
    fetch(enUrl).then(async (res) => {
      if (!res.ok) throw new Error(`English fetch failed: ${res.status}`);
      return res.json() as Promise<SefariaTextResponse>;
    }),
  ]);

  const heData = heResult.status === "fulfilled" ? heResult.value : null;
  const enData = enResult.status === "fulfilled" ? enResult.value : null;

  // Both failed — throw
  if (!heData && !enData) {
    const heErr = heResult.status === "rejected" ? heResult.reason : "no data";
    const enErr = enResult.status === "rejected" ? enResult.reason : "no data";
    throw new Error(
      `Both language fetches failed: Hebrew: ${heErr}, English: ${enErr}`,
    );
  }

  const { halakhot, chapterBreaks } = processTextResponse(heData, enData);

  return {
    halakhot,
    chapterBreaks,
    languagesLoaded: {
      he: heData !== null,
      en: enData !== null,
    },
  };
}

/**
 * Fetch halakha text content from Sefaria (local-first)
 * @param ref - Sefaria reference string
 * @returns Array of halakha texts with chapter information and language status
 */
export async function fetchHalakhot(ref: string): Promise<{
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  languagesLoaded: LanguagesLoaded;
}> {
  // Detect truncated sections — may need to fetch full content and slice
  const { fetchRef, sliceStart } = normalizeIntroRef(ref);

  // 1. Check IndexedDB first (instant, ~5ms)
  const cached = await getTextFromDB(fetchRef);
  if (cached && !isStale(cached.fetchedAt, TEXT_STALE_DAYS)) {
    // Derive languagesLoaded from cached data when the stored field is missing
    // (backward compat: entries saved before languagesLoaded was added)
    const hasHe = cached.halakhot.some((h) => h.he && h.he.length > 0);
    const hasEn = cached.halakhot.some((h) => h.en && h.en.length > 0);
    return sliceHalakhot(
      {
        halakhot: cached.halakhot,
        chapterBreaks: cached.chapterBreaks,
        languagesLoaded: cached.languagesLoaded ?? { he: hasHe, en: hasEn },
      },
      sliceStart,
    );
  }

  // 2. If offline, return stale cache if available
  if (!(await isReachable())) {
    if (cached) {
      const hasHe = cached.halakhot.some((h) => h.he && h.he.length > 0);
      const hasEn = cached.halakhot.some((h) => h.en && h.en.length > 0);
      return sliceHalakhot(
        {
          halakhot: cached.halakhot,
          chapterBreaks: cached.chapterBreaks,
          languagesLoaded: cached.languagesLoaded ?? { he: hasHe, en: hasEn },
        },
        sliceStart,
      );
    }
    throw new Error("Offline and no cached text available");
  }

  // 3. Fetch from network (using normalized ref for full content)
  const result = await fetchHalakhotFromNetwork(fetchRef);

  // 4. Save full content to IndexedDB (before slicing — cache the complete section)
  saveTextToDB(
    fetchRef,
    result.halakhot,
    result.chapterBreaks,
    result.languagesLoaded,
  ).catch((err) => console.error("Failed to cache text:", err));

  // 5. Slice to the requested range (e.g., items 246+ for rambam1's last chunk)
  return sliceHalakhot(result, sliceStart);
}

/**
 * Fetch halakhot for multiple refs and combine them
 * Used for Sefer HaMitzvot which may have multiple commandments per day
 * @param refs - Array of Sefaria reference strings
 * @returns Combined halakhot with chapter breaks and language status
 */
export async function fetchMultipleHalakhot(refs: string[]): Promise<{
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  languagesLoaded: LanguagesLoaded;
}> {
  if (refs.length === 0) {
    return {
      halakhot: [],
      chapterBreaks: [],
      languagesLoaded: { he: true, en: true },
    };
  }

  if (refs.length === 1) {
    return fetchHalakhot(refs[0]);
  }

  // Fetch all refs in parallel
  const results = await Promise.all(
    refs.map((ref) => fetchHalakhot(ref).catch(() => null)),
  );

  // Combine results
  const allHalakhot: HalakhaText[] = [];
  const allChapterBreaks: number[] = [];
  let currentIndex = 0;
  // AND logic: report a language as loaded only if ALL sub-refs have it.
  // This prevents showing "English loaded" when 2 of 3 commandments lack translations.
  let allHe = true;
  let allEn = true;

  results.forEach((result, idx) => {
    if (!result) {
      allHe = false;
      allEn = false;
      return;
    }

    if (!result.languagesLoaded.he) allHe = false;
    if (!result.languagesLoaded.en) allEn = false;

    // Add chapter break before each new ref (except first)
    if (idx > 0 && currentIndex > 0) {
      allChapterBreaks.push(currentIndex);
    }

    result.halakhot.forEach((h, i) => {
      allHalakhot.push({
        ...h,
        chapter: idx + 1, // Use ref index as chapter
        isFirstInChapter: i === 0,
      });
      currentIndex++;
    });
  });

  return {
    halakhot: allHalakhot,
    chapterBreaks: allChapterBreaks,
    languagesLoaded: { he: allHe, en: allEn },
  };
}

/**
 * Prefetch text and save to IndexedDB
 * Returns true if successfully fetched and cached
 */
export async function prefetchText(ref: string): Promise<boolean> {
  const { fetchRef } = normalizeIntroRef(ref);
  try {
    // Check if already cached and fresh
    const cached = await getTextFromDB(fetchRef);
    if (cached && !isStale(cached.fetchedAt, TEXT_STALE_DAYS)) {
      return true; // Already have fresh data
    }

    // Fetch and cache
    const result = await fetchHalakhotFromNetwork(fetchRef);
    await saveTextToDB(
      fetchRef,
      result.halakhot,
      result.chapterBreaks,
      result.languagesLoaded,
    );
    return true;
  } catch (error) {
    console.error(`Failed to prefetch text ${ref}:`, error);
    return false;
  }
}

/**
 * Check if text is available in cache (for UI indicators)
 */
export async function isTextCached(ref: string): Promise<boolean> {
  const cached = await getTextFromDB(normalizeIntroRef(ref).fetchRef);
  return cached !== undefined;
}

/**
 * Check if text is cached and fresh
 */
export async function isTextCachedAndFresh(ref: string): Promise<boolean> {
  const cached = await getTextFromDB(normalizeIntroRef(ref).fetchRef);
  return cached !== undefined && !isStale(cached.fetchedAt, TEXT_STALE_DAYS);
}
