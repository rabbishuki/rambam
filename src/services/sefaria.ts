/**
 * Sefaria API service with local-first data access
 * Data is stored in IndexedDB first, network is used only when needed
 * Uses HebCal for Sefer HaMitzvot schedule, Sefaria for text
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

const SEFARIA_API = "https://www.sefaria.org";
const HEBCAL_API = "https://www.hebcal.com";

// Staleness threshold in days
const TEXT_STALE_DAYS = 7; // Texts rarely change
const CALENDAR_STALE_DAYS = 1; // Calendar data should be refreshed daily

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

interface HebcalItem {
  title: string;
  date: string;
  hdate: string;
  category: string;
  hebrew?: string;
  link?: string;
}

interface HebcalResponse {
  items: HebcalItem[];
}

// Connectivity check is now handled by ./connectivity.ts (isReachable)

/**
 * Parse HebCal Sefer HaMitzvot title to extract Sefaria references
 * Examples:
 *   "Day 1: Maimonides' Introduction to Sefer Hamitzvot" → ["Sefer HaMitzvot, Introductions, The Rambam's Introduction"]
 *   "Day 2: Principle 1-3" → ["Sefer HaMitzvot, Shorashim 1-3"]
 *   "Day 13: N10, N47, P186" → ["Sefer HaMitzvot, Negative Commandments 10", ...]
 */
function parseSeferHaMitzvotTitle(title: string): string[] {
  // Remove "Day X: " prefix
  const content = title.replace(/^Day \d+:\s*/, "");

  // Handle "Maimonides' Introduction to Sefer Hamitzvot"
  if (content.includes("Introduction to Sefer Hamitzvot")) {
    return ["Sefer HaMitzvot, Introductions, The Rambam's Introduction"];
  }

  // Handle "Principle X-Y" format (Shorashim/Roots)
  const principleMatch = content.match(/Principle (\d+)(?:-(\d+))?/);
  if (principleMatch) {
    const start = principleMatch[1];
    const end = principleMatch[2];
    if (end) {
      return [`Sefer HaMitzvot, Shorashim ${start}-${end}`];
    }
    return [`Sefer HaMitzvot, Shorashim ${start}`];
  }

  // Handle comma-separated commandments: "N10, N47, P186"
  const refs: string[] = [];
  const codes = content.split(/,\s*/);

  for (const code of codes) {
    const trimmed = code.trim();

    // N = Negative Commandment
    const negMatch = trimmed.match(/^N(\d+)$/);
    if (negMatch) {
      refs.push(`Sefer HaMitzvot, Negative Commandments ${negMatch[1]}`);
      continue;
    }

    // P = Positive Commandment
    const posMatch = trimmed.match(/^P(\d+)$/);
    if (posMatch) {
      refs.push(`Sefer HaMitzvot, Positive Commandments ${posMatch[1]}`);
      continue;
    }
  }

  return refs;
}

/**
 * Fetch Sefer HaMitzvot calendar from HebCal (with local-first caching)
 */
async function fetchSeferHaMitzvotCalendar(
  dateStr: string,
): Promise<
  Pick<DayData, "he" | "en" | "ref" | "heDate" | "enDate"> & { refs: string[] }
> {
  // Check IndexedDB first
  const cached = await getCalendarFromDB("mitzvot", dateStr);
  if (cached && !isStale(cached.fetchedAt, CALENDAR_STALE_DAYS)) {
    // Reconstruct refs from the ref field
    const refs = cached.ref.includes(",")
      ? cached.ref.split(",").map((r) => r.trim())
      : [cached.ref];
    return {
      he: cached.he,
      en: cached.en,
      ref: cached.ref,
      refs,
      heDate: cached.heDate,
      enDate: cached.enDate,
    };
  }

  // If offline, return stale cache if available
  if (!(await isReachable())) {
    if (cached) {
      const refs = cached.ref.includes(",")
        ? cached.ref.split(",").map((r) => r.trim())
        : [cached.ref];
      return {
        he: cached.he,
        en: cached.en,
        ref: cached.ref,
        refs,
        heDate: cached.heDate,
        enDate: cached.enDate,
      };
    }
    throw new Error("Offline and no cached data available");
  }

  const url = `${HEBCAL_API}/hebcal?cfg=json&v=1&dsm=on&start=${dateStr}&end=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (cached) {
      const refs = cached.ref.includes(",")
        ? cached.ref.split(",").map((r) => r.trim())
        : [cached.ref];
      return {
        he: cached.he,
        en: cached.en,
        ref: cached.ref,
        refs,
        heDate: cached.heDate,
        enDate: cached.enDate,
      };
    }
    throw new Error(`HebCal API failed: ${res.status}`);
  }

  const data: HebcalResponse = await res.json();
  const entry = data.items.find((item) => item.category === "seferHaMitzvot");

  if (!entry) {
    throw new Error(`No Sefer HaMitzvot entry found for ${dateStr}`);
  }

  const refs = parseSeferHaMitzvotTitle(entry.title);

  // Create display text
  const dayMatch = entry.title.match(/Day (\d+)/);
  const dayNum = dayMatch ? dayMatch[1] : "?";

  const heDisplay = `ספר המצוות - יום ${dayNum}`;
  const enDisplay = entry.title;

  const result = {
    he: heDisplay,
    en: enDisplay,
    ref: refs[0] || entry.title,
    refs,
    heDate: undefined as string | undefined,
    enDate: undefined as string | undefined,
  };

  // Save to IndexedDB (store refs as comma-separated in ref field)
  saveCalendarToDB("mitzvot", dateStr, {
    he: result.he,
    en: result.en,
    ref: refs.join(", "),
    count: 0,
  }).catch((err) => console.error("Failed to cache calendar:", err));

  return result;
}

/**
 * Fetch Sefaria calendar (with local-first caching)
 */
async function fetchSefariaCalendar(
  dateStr: string,
  path: StudyPath,
): Promise<Pick<DayData, "he" | "en" | "ref" | "heDate" | "enDate">> {
  // Check IndexedDB first
  const cached = await getCalendarFromDB(path, dateStr);
  if (cached && !isStale(cached.fetchedAt, CALENDAR_STALE_DAYS)) {
    return {
      he: cached.he,
      en: cached.en,
      ref: cached.ref,
      heDate: cached.heDate,
      enDate: cached.enDate,
    };
  }

  // If offline, return stale cache if available
  if (!(await isReachable())) {
    if (cached) {
      return {
        he: cached.he,
        en: cached.en,
        ref: cached.ref,
        heDate: cached.heDate,
        enDate: cached.enDate,
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
        heDate: cached.heDate,
        enDate: cached.enDate,
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
    heDate: undefined as string | undefined,
    enDate: undefined as string | undefined,
  };

  // Save to IndexedDB
  saveCalendarToDB(path, dateStr, {
    he: result.he,
    en: result.en,
    ref: result.ref,
    count: 0,
  }).catch((err) => console.error("Failed to cache calendar:", err));

  return result;
}

/**
 * Fetch the daily calendar entry from Sefaria or HebCal (local-first)
 * @param dateStr - Date string (YYYY-MM-DD)
 * @param path - Study path (rambam3, rambam1, or mitzvot)
 * @returns Day data with Hebrew/English display text and reference
 */
export async function fetchCalendar(
  dateStr: string,
  path: StudyPath,
): Promise<
  Pick<DayData, "he" | "en" | "ref" | "heDate" | "enDate"> & { refs?: string[] }
> {
  // Use HebCal for Sefer HaMitzvot
  if (path === "mitzvot") {
    return fetchSeferHaMitzvotCalendar(dateStr);
  }

  // Use Sefaria for Rambam
  return fetchSefariaCalendar(dateStr, path);
}

/**
 * Process raw Sefaria text response into halakhot array
 */
function processTextResponse(
  heData: SefariaTextResponse,
  enData: SefariaTextResponse | null,
): { halakhot: HalakhaText[]; chapterBreaks: number[] } {
  const halakhot: HalakhaText[] = [];
  const chapterBreaks: number[] = [];

  const heText = heData.versions[0]?.text;
  const enText = enData?.versions[0]?.text;

  if (heData.isSpanning) {
    // Multiple chapters - text is array of arrays
    let currentIndex = 0;
    const heChapters = heText as string[][];
    const enChapters = enText as string[][] | undefined;

    heChapters.forEach((chapter, chapterNum) => {
      if (chapterNum > 0) {
        chapterBreaks.push(currentIndex);
      }

      chapter.forEach((heContent, idx) => {
        halakhot.push({
          he: heContent,
          en: enChapters?.[chapterNum]?.[idx],
          chapter: chapterNum + 1,
          isFirstInChapter: idx === 0,
        });
        currentIndex++;
      });
    });
  } else if (Array.isArray(heText)) {
    // Single chapter - text is flat array
    const heArray = heText as string[];
    const enArray = enText as string[] | undefined;

    heArray.forEach((heContent, idx) => {
      halakhot.push({
        he: heContent,
        en: enArray?.[idx],
        chapter: 1,
        isFirstInChapter: idx === 0,
      });
    });
  } else {
    // Single halakha - text is string
    halakhot.push({
      he: heText as string,
      en: enText as string | undefined,
      chapter: 1,
      isFirstInChapter: true,
    });
  }

  return { halakhot, chapterBreaks };
}

/**
 * Fetch halakha text directly from network (bypasses cache)
 * Used internally and for prefetch
 */
async function fetchHalakhotFromNetwork(
  ref: string,
): Promise<{ halakhot: HalakhaText[]; chapterBreaks: number[] }> {
  // Fetch Hebrew text
  const heUrl = `${SEFARIA_API}/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew`;
  const heRes = await fetch(heUrl);
  if (!heRes.ok) {
    throw new Error(`Text API failed for Hebrew: ${heRes.status}`);
  }
  const heData: SefariaTextResponse = await heRes.json();

  // Fetch English text
  const enUrl = `${SEFARIA_API}/api/v3/texts/${encodeURIComponent(ref)}?version=english`;
  const enRes = await fetch(enUrl);
  const enData: SefariaTextResponse | null = enRes.ok
    ? await enRes.json()
    : null;

  return processTextResponse(heData, enData);
}

/**
 * Fetch halakha text content from Sefaria (local-first)
 * @param ref - Sefaria reference string
 * @returns Array of halakha texts with chapter information
 */
export async function fetchHalakhot(
  ref: string,
): Promise<{ halakhot: HalakhaText[]; chapterBreaks: number[] }> {
  // 1. Check IndexedDB first (instant, ~5ms)
  const cached = await getTextFromDB(ref);
  if (cached && !isStale(cached.fetchedAt, TEXT_STALE_DAYS)) {
    return {
      halakhot: cached.halakhot,
      chapterBreaks: cached.chapterBreaks,
    };
  }

  // 2. If offline, return stale cache if available
  if (!(await isReachable())) {
    if (cached) {
      return {
        halakhot: cached.halakhot,
        chapterBreaks: cached.chapterBreaks,
      };
    }
    throw new Error("Offline and no cached text available");
  }

  // 3. Fetch from network
  const result = await fetchHalakhotFromNetwork(ref);

  // 4. Save to IndexedDB (fire and forget)
  saveTextToDB(ref, result.halakhot, result.chapterBreaks).catch((err) =>
    console.error("Failed to cache text:", err),
  );

  return result;
}

/**
 * Fetch halakhot for multiple refs and combine them
 * Used for Sefer HaMitzvot which may have multiple commandments per day
 * @param refs - Array of Sefaria reference strings
 * @returns Combined halakhot with chapter breaks
 */
export async function fetchMultipleHalakhot(
  refs: string[],
): Promise<{ halakhot: HalakhaText[]; chapterBreaks: number[] }> {
  if (refs.length === 0) {
    return { halakhot: [], chapterBreaks: [] };
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

  results.forEach((result, idx) => {
    if (!result) return;

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

  return { halakhot: allHalakhot, chapterBreaks: allChapterBreaks };
}

/**
 * Prefetch text and save to IndexedDB
 * Returns true if successfully fetched and cached
 */
export async function prefetchText(ref: string): Promise<boolean> {
  try {
    // Check if already cached and fresh
    const cached = await getTextFromDB(ref);
    if (cached && !isStale(cached.fetchedAt, TEXT_STALE_DAYS)) {
      return true; // Already have fresh data
    }

    // Fetch and cache
    const result = await fetchHalakhotFromNetwork(ref);
    await saveTextToDB(ref, result.halakhot, result.chapterBreaks);
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
  const cached = await getTextFromDB(ref);
  return cached !== undefined;
}

/**
 * Check if text is cached and fresh
 */
export async function isTextCachedAndFresh(ref: string): Promise<boolean> {
  const cached = await getTextFromDB(ref);
  return cached !== undefined && !isStale(cached.fetchedAt, TEXT_STALE_DAYS);
}
