/**
 * Hook for fetching and caching halakha text data
 */

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import {
  fetchHalakhot,
  fetchMultipleHalakhot,
  type LanguagesLoaded,
} from "@/services/sefaria";
import type { HalakhaText, StudyPath } from "@/types";

interface UseHalakhaDataReturn {
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  languagesLoaded: LanguagesLoaded | null;
}

/**
 * Fetch and cache halakha text for a given reference
 * Supports single ref (Rambam) or multiple refs (Sefer HaMitzvot)
 * @param ref - Primary Sefaria reference string
 * @param date - Date string for caching in store
 * @param studyPath - Study path for proper caching
 * @param refs - Optional array of multiple refs (for Sefer HaMitzvot)
 */
export function useHalakhaData(
  ref: string,
  date: string,
  studyPath: StudyPath,
  refs?: string[],
): UseHalakhaDataReturn {
  // Narrow selector: only subscribe to this specific day's data
  const dayData = useAppStore((state) => state.days[studyPath]?.[date]);
  const setDayData = useAppStore((state) => state.setDayData);

  const [halakhot, setHalakhot] = useState<HalakhaText[]>([]);
  const [chapterBreaks, setChapterBreaks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languagesLoaded, setLanguagesLoaded] =
    useState<LanguagesLoaded | null>(null);

  const fetchData = useCallback(async () => {
    if (!ref && (!refs || refs.length === 0)) return;

    // Check if we already have cached texts
    if (dayData?.texts && dayData.texts.length > 0) {
      setHalakhot(dayData.texts);
      setChapterBreaks(dayData.chapterBreaks || []);
      // Derive languagesLoaded from cached Zustand data by inspecting actual content.
      // Decision: We don't persist languagesLoaded in Zustand because it's only
      // relevant for the UI warning banner — deriving it from data is cheap and
      // avoids adding another field to the persisted store.
      const hasHe = dayData.texts.some((h) => h.he && h.he.length > 0);
      const hasEn = dayData.texts.some((h) => h.en && h.en.length > 0);
      setLanguagesLoaded({ he: hasHe, en: hasEn });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result: {
        halakhot: HalakhaText[];
        chapterBreaks: number[];
        languagesLoaded: LanguagesLoaded;
      };

      // Use multiple refs if provided (Sefer HaMitzvot), otherwise use single ref
      if (refs && refs.length > 0) {
        result = await fetchMultipleHalakhot(refs);
      } else {
        result = await fetchHalakhot(ref);
      }

      setHalakhot(result.halakhot);
      setChapterBreaks(result.chapterBreaks);
      setLanguagesLoaded(result.languagesLoaded);

      // Cache in store
      if (dayData) {
        setDayData(studyPath, date, {
          ...dayData,
          texts: result.halakhot,
          chapterBreaks: result.chapterBreaks,
        });
      }
    } catch (err) {
      console.error("Failed to fetch halakhot:", err);
      setError(err instanceof Error ? err.message : "Failed to load text");
    } finally {
      setIsLoading(false);
    }
  }, [ref, refs, date, studyPath, dayData, setDayData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    halakhot,
    chapterBreaks,
    isLoading,
    error,
    refetch: fetchData,
    languagesLoaded,
  };
}

/**
 * Prefetch halakha data for multiple days
 * Useful for preloading upcoming days
 */
export async function prefetchHalakhot(
  refsOrRefsList: string[] | string[][],
  studyPath: StudyPath,
  dates: string[],
  setDayData: (path: StudyPath, date: string, data: unknown) => void,
  days: Record<string, unknown>,
): Promise<void> {
  const fetchPromises = refsOrRefsList.map(async (refOrRefs, index) => {
    const date = dates[index];
    const dayData = days[date] as { texts?: HalakhaText[] } | undefined;

    // Skip if already cached
    if (dayData?.texts && dayData.texts.length > 0) {
      return;
    }

    try {
      let result: { halakhot: HalakhaText[]; chapterBreaks: number[] };

      // Handle both single ref and array of refs
      if (Array.isArray(refOrRefs) && refOrRefs.length > 1) {
        result = await fetchMultipleHalakhot(refOrRefs);
      } else {
        const ref = Array.isArray(refOrRefs) ? refOrRefs[0] : refOrRefs;
        result = await fetchHalakhot(ref);
      }

      if (dayData) {
        setDayData(studyPath, date, {
          ...dayData,
          texts: result.halakhot,
          chapterBreaks: result.chapterBreaks,
        });
      }
    } catch (err) {
      console.error(`Failed to prefetch:`, err);
    }
  });

  await Promise.allSettled(fetchPromises);
}
