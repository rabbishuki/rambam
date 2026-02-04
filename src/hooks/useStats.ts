/**
 * Hook for computing study statistics
 * Derives stats from the app store
 */

import { useMemo } from "react";
import { useAppStore, countCompleted } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import { dateRange, getJewishDate } from "@/lib/dates";
import type { Stats } from "@/types";

/**
 * Compute and return study statistics for the current path
 */
export function useStats(): Stats {
  const studyPath = useAppStore((state) => state.studyPath);
  const startDates = useAppStore((state) => state.startDates);
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);
  const sunset = useLocationStore((state) => state.sunset);

  return useMemo(() => {
    const startDate = startDates[studyPath];
    const today = getJewishDate(sunset);
    const pathDays = days[studyPath];

    // Get all dates from start to today
    const allDates = dateRange(startDate, today);

    let completedDays = 0;
    let totalDays = 0;
    let todayDoneCount = 0;
    let todayTotalCount = 0;
    let backlog = 0;

    allDates.forEach((date) => {
      const dayData = pathDays[date];
      if (!dayData) return;

      totalDays++;
      const doneCount = countCompleted(done, studyPath, date);
      const isComplete = doneCount >= dayData.count;

      if (isComplete) {
        completedDays++;
      }

      if (date === today) {
        todayDoneCount = doneCount;
        todayTotalCount = dayData.count;
      } else if (date < today) {
        // Backlog: incomplete halakhot from past days
        const remaining = dayData.count - doneCount;
        if (remaining > 0) {
          backlog += remaining;
        }
      }
    });

    const todayPercent =
      todayTotalCount > 0
        ? Math.round((todayDoneCount / todayTotalCount) * 100)
        : 0;

    return {
      completedDays,
      totalDays,
      todayPercent,
      backlog,
    };
  }, [studyPath, startDates, days, done, sunset]);
}

/**
 * Get completion info for a specific day
 */
export function useDayCompletion(date: string): {
  doneCount: number;
  totalCount: number;
  isComplete: boolean;
  percent: number;
} {
  const studyPath = useAppStore((state) => state.studyPath);
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);

  return useMemo(() => {
    const dayData = days[studyPath][date];
    if (!dayData) {
      return { doneCount: 0, totalCount: 0, isComplete: false, percent: 0 };
    }

    const doneCount = countCompleted(done, studyPath, date);
    const totalCount = dayData.count;
    const isComplete = doneCount >= totalCount;
    const percent =
      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return { doneCount, totalCount, isComplete, percent };
  }, [studyPath, days, done, date]);
}
