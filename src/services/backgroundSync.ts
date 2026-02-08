/**
 * Background sync service for keeping calendar data fresh
 * Syncs data periodically when online and tab is visible
 * Also handles daily prefetch of upcoming content
 */

import type { StudyPath } from "@/types";
import { fetchCalendar, fetchHalakhot } from "./sefaria";
import {
  getCalendarFromDB,
  getTextFromDB,
  getMeta,
  setMeta,
  cleanupCompletedDays,
  clearStaleData,
} from "./database";
import { getJewishDate, formatDateString } from "@/lib/dates";
import { useLocationStore } from "@/stores/locationStore";
import { useAppStore } from "@/stores/appStore";
import { useOfflineStore } from "@/stores/offlineStore";
import { isReachable } from "./connectivity";

// Sync interval: 30 minutes
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Daily prefetch: once per day
const PREFETCH_KEY = "lastDailyPrefetch";

// Track if sync is already running
let syncInProgress = false;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Check if conditions are right for background sync.
 * Uses a real ping to Sefaria instead of navigator.onLine.
 */
async function canSync(): Promise<boolean> {
  // Tab must be visible (respect battery/data)
  if (
    typeof document !== "undefined" &&
    document.visibilityState !== "visible"
  ) {
    return false;
  }

  // Must be truly reachable (pings Sefaria, cached 30s)
  return await isReachable();
}

/**
 * Get upcoming dates based on Jewish date
 */
function getUpcomingDates(count = 3): string[] {
  const dates: string[] = [];
  const sunset = useLocationStore.getState().sunset;
  const todayStr = getJewishDate(sunset);
  const today = new Date(todayStr);

  for (let i = 0; i < count; i++) {
    dates.push(formatDateString(today));
    today.setDate(today.getDate() + 1);
  }

  return dates;
}

/**
 * Sync calendar data for a specific path.
 * Returns true if any data was updated.
 *
 * Decision: syncPath is kept even though Sefer HaMitzvot schedules are now local,
 * because Rambam 1 & 3 still use Sefaria Calendar API. The calendar cache in IndexedDB
 * has a 1-day staleness window — this function refreshes it so users see correct
 * schedule data even if they haven't opened the day yet.
 */
async function syncPath(path: StudyPath): Promise<boolean> {
  const dates = getUpcomingDates();
  let hasUpdates = false;

  for (const date of dates) {
    try {
      // Get current cached data
      const cached = await getCalendarFromDB(path, date);

      // Fetch fresh data (this will also update the cache)
      const fresh = await fetchCalendar(date, path);

      // Check if data changed
      if (cached && fresh.ref !== cached.ref) {
        hasUpdates = true;
      }
    } catch (error) {
      console.error(`Background sync failed for ${path}/${date}:`, error);
    }
  }

  return hasUpdates;
}

/**
 * Check if daily prefetch should run
 */
async function shouldRunDailyPrefetch(): Promise<boolean> {
  const sunset = useLocationStore.getState().sunset;
  const today = getJewishDate(sunset);
  const lastPrefetch = await getMeta<string>(PREFETCH_KEY);

  // Run if never prefetched or last prefetch was before today
  return !lastPrefetch || lastPrefetch < today;
}

/**
 * Prefetch upcoming days for all active study paths
 * Downloads calendar + full text content for the next few days
 * Reports progress through the offline store for UI feedback
 */
async function runDailyPrefetch(): Promise<{
  success: boolean;
  failed: number;
}> {
  const { activePaths, daysAhead, setDayData } = useAppStore.getState();
  const sunset = useLocationStore.getState().sunset;
  const todayStr = getJewishDate(sunset);
  const setSyncProgress = useOfflineStore.getState().setSyncProgress;

  // today + daysAhead future days = daysAhead + 1 total (matches PrefetchButton UI)
  const daysToFetch = daysAhead + 1;
  const totalItems = daysToFetch * activePaths.length;
  console.log(
    `[BackgroundSync] Running daily prefetch for ${activePaths.join(", ")} (${daysToFetch} days)`,
  );

  // Report sync started
  setSyncProgress({
    status: "syncing",
    total: totalItems,
    completed: 0,
  });

  let completed = 0;
  let failed = 0;

  for (const path of activePaths) {
    const today = new Date(todayStr);
    for (let i = 0; i <= daysAhead; i++) {
      const date = formatDateString(today);
      today.setDate(today.getDate() + 1);

      try {
        // Fetch calendar entry — for mitzvot this is pure local computation,
        // for Rambam it hits Sefaria Calendar API (with IndexedDB caching).
        // Hebrew dates are always computed locally via @hebcal/core.
        const calData = await fetchCalendar(date, path);

        // Fetch full halakhot text (this saves to IndexedDB)
        const { halakhot, chapterBreaks } = await fetchHalakhot(calData.ref);

        // Update app store with metadata
        setDayData(path, date, {
          he: calData.he,
          en: calData.en,
          ref: calData.ref,
          refs: "refs" in calData ? calData.refs : undefined,
          count: halakhot.length,
          heDate: calData.heDate,
          enDate: calData.enDate,
          texts: halakhot,
          chapterBreaks,
        });

        completed++;
        setSyncProgress({
          status: "syncing",
          total: totalItems,
          completed,
        });

        console.log(`[BackgroundSync] Prefetched ${path}/${date}`);
      } catch (error) {
        failed++;
        console.error(
          `[BackgroundSync] Failed to prefetch ${path}/${date}:`,
          error,
        );
      }
    }
  }

  // Mark prefetch as done for today
  const sunsetForMeta = useLocationStore.getState().sunset;
  await setMeta(PREFETCH_KEY, getJewishDate(sunsetForMeta));

  // Clean up old IndexedDB cache (runs once per day alongside prefetch)
  try {
    const { done, bookmarks, textRetentionDays, pinnedDays } =
      useAppStore.getState();
    const staleCleared = await clearStaleData(30);
    if (staleCleared > 0) {
      console.log(`[BackgroundSync] Cleaned up ${staleCleared} stale entries`);
    }
    if (textRetentionDays > 0) {
      const daysCleared = await cleanupCompletedDays(
        done,
        bookmarks,
        activePaths,
        textRetentionDays,
        pinnedDays,
      );
      if (daysCleared > 0) {
        console.log(
          `[BackgroundSync] Cleaned up ${daysCleared} completed days`,
        );
      }
    }
  } catch (err) {
    console.error("[BackgroundSync] Cleanup failed:", err);
  }

  return { success: failed === 0, failed };
}

/**
 * Download text content for any pinned days that aren't yet cached in IndexedDB
 */
async function syncPinnedDays(): Promise<void> {
  const { pinnedDays, days, setDayData } = useAppStore.getState();
  const pinnedKeys = Object.keys(pinnedDays);
  if (pinnedKeys.length === 0) return;

  for (const key of pinnedKeys) {
    const [path, date] = key.split(":") as [StudyPath, string];

    try {
      // Check if text already exists in IndexedDB
      const dayData = days[path]?.[date];
      const ref = dayData?.ref;
      if (!ref) {
        // Need to fetch calendar data first
        const calData = await fetchCalendar(date, path);
        const { halakhot, chapterBreaks } = await fetchHalakhot(calData.ref);

        setDayData(path, date, {
          he: calData.he,
          en: calData.en,
          ref: calData.ref,
          refs: "refs" in calData ? calData.refs : undefined,
          count: halakhot.length,
          heDate: calData.heDate,
          enDate: calData.enDate,
          texts: halakhot,
          chapterBreaks,
        });
        console.log(`[BackgroundSync] Downloaded pinned day ${key}`);
        continue;
      }

      // Check if text is cached
      const cachedText = await getTextFromDB(ref);
      if (!cachedText) {
        const { halakhot, chapterBreaks } = await fetchHalakhot(ref);
        setDayData(path, date, {
          ...dayData,
          texts: halakhot,
          chapterBreaks,
        });
        console.log(`[BackgroundSync] Downloaded pinned text for ${key}`);
      }
    } catch (err) {
      console.error(`[BackgroundSync] Failed to fetch pinned day ${key}:`, err);
    }
  }
}

// Auto-dismiss timeout for success/error banners
const BANNER_DISMISS_MS = 3000;

/**
 * Run a background sync for all paths
 * Reports progress through the offline store for UI feedback
 */
async function runSync(): Promise<void> {
  if (syncInProgress || !(await canSync())) {
    return;
  }

  syncInProgress = true;
  const { setSyncProgress, clearSyncStatus } = useOfflineStore.getState();

  try {
    // First, check if daily prefetch is needed
    if (await shouldRunDailyPrefetch()) {
      const result = await runDailyPrefetch();

      // Show success or error banner
      if (result.success) {
        setSyncProgress({ status: "success" });
      } else {
        setSyncProgress({
          status: "error",
          message: `Failed ${result.failed} days`,
        });
      }

      // Auto-dismiss after delay
      setTimeout(() => {
        clearSyncStatus();
      }, BANNER_DISMISS_MS);
    }

    // Then sync calendar data for all paths (silent, no banner)
    const paths: StudyPath[] = ["rambam3", "rambam1", "mitzvot"];

    for (const path of paths) {
      await syncPath(path);
      // Content updates are applied silently - cache is already updated
      // Users will see fresh data on next view without interruption
    }

    // Process pinned days: fetch text for any pinned day missing from IndexedDB
    await syncPinnedDays();
  } catch (error) {
    console.error("Background sync failed:", error);
    setSyncProgress({ status: "error" });
    setTimeout(() => {
      clearSyncStatus();
    }, BANNER_DISMISS_MS);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Start the background sync service
 * Should be called once when the app initializes
 */
export function startBackgroundSync(): void {
  if (syncIntervalId) {
    return; // Already running
  }

  // Run initial sync after a short delay
  setTimeout(() => {
    runSync();
  }, 5000);

  // Set up periodic sync
  syncIntervalId = setInterval(() => {
    runSync();
  }, SYNC_INTERVAL_MS);

  // Also sync when tab becomes visible
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    });
  }

  // Also sync when coming back online
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      runSync();
    });
  }
}

/**
 * Stop the background sync service
 */
export function stopBackgroundSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

/**
 * Manually trigger a sync (e.g., from a refresh button)
 */
export async function triggerSync(): Promise<void> {
  await runSync();
}
