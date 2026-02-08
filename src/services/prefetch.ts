/**
 * Prefetch service for downloading content ahead of time
 * Allows users to download a week's worth of content for offline use
 */

import type { StudyPath } from "@/types";
import { formatDateString } from "@/lib/dates";
import { fetchCalendar, prefetchText } from "./sefaria";
import { isReachable } from "./connectivity";

export interface PrefetchProgress {
  total: number;
  completed: number;
  failed: number;
  currentDate: string | null;
  status: "idle" | "prefetching" | "completed" | "error";
  error?: string;
}

export interface PrefetchResult {
  success: boolean;
  totalDays: number;
  successfulDays: number;
  failedDays: number;
}

/**
 * Generate array of date strings for the next N days
 */
function getNextDays(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Prefetch a single day's content
 */
async function prefetchDay(
  date: string,
  studyPath: StudyPath,
): Promise<boolean> {
  try {
    // 1. Fetch calendar entry (this also caches it)
    const calendarData = await fetchCalendar(date, studyPath);

    // 2. Fetch the text content
    if (
      studyPath === "mitzvot" &&
      "refs" in calendarData &&
      calendarData.refs
    ) {
      // For Sefer HaMitzvot, prefetch all refs
      const results = await Promise.all(
        calendarData.refs.map((ref) => prefetchText(ref)),
      );
      if (results.some((r) => !r)) {
        return false;
      }
    } else {
      // For Rambam, single ref
      const success = await prefetchText(calendarData.ref);
      if (!success) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to prefetch ${date}:`, error);
    return false;
  }
}

/**
 * Prefetch content for the next N days
 * @param startDate - Start date (YYYY-MM-DD), typically today
 * @param studyPath - The study path to prefetch for
 * @param onProgress - Optional callback for progress updates
 * @param dayCount - Number of days to prefetch (default 7)
 * @returns Result with success/failure counts
 */
export async function prefetchWeekAhead(
  startDate: string,
  studyPath: StudyPath,
  onProgress?: (progress: PrefetchProgress) => void,
  dayCount = 7,
): Promise<PrefetchResult> {
  const days = getNextDays(startDate, dayCount);
  let completed = 0;
  let failed = 0;

  const reportProgress = (
    currentDate: string | null,
    status: PrefetchProgress["status"],
  ) => {
    onProgress?.({
      total: days.length,
      completed,
      failed,
      currentDate,
      status,
    });
  };

  reportProgress(null, "prefetching");

  for (const date of days) {
    reportProgress(date, "prefetching");

    const success = await prefetchDay(date, studyPath);
    if (success) {
      completed++;
    } else {
      failed++;
    }

    reportProgress(date, "prefetching");
  }

  const result: PrefetchResult = {
    success: failed === 0,
    totalDays: days.length,
    successfulDays: completed,
    failedDays: failed,
  };

  reportProgress(null, failed === 0 ? "completed" : "error");

  return result;
}

/**
 * Check if prefetch is possible (truly reachable, not just navigator.onLine)
 */
export async function canPrefetch(): Promise<boolean> {
  return await isReachable();
}
