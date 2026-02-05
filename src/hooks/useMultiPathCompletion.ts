/**
 * Hook for computing completion status for multiple paths on a single date
 * Used for calendar visualization with dots + percentage
 */

import { useAppStore } from "@/stores/appStore";
import type { StudyPath, DayData } from "@/types";
import type { HebrewDayData } from "@/lib/hebrewCalendar";

export interface PathCompletionStatus {
  path: StudyPath;
  percent: number;
  isComplete: boolean;
  doneCount: number;
  totalCount: number;
}

export interface MultiPathDayStatus {
  /** Status for each active path */
  pathStatuses: PathCompletionStatus[];
  /** Overall background color key */
  bgColor: "green" | "orange" | "yellow" | "gray";
  /** Aggregate percent of incomplete paths (for display) */
  aggregateIncompletePercent: number | null;
  /** Are all paths complete? */
  allComplete: boolean;
  /** Any path has progress? */
  hasAnyProgress: boolean;
}

/**
 * Get completion status for a single day across multiple paths
 */
export function getMultiPathDayStatus(
  date: string,
  activePaths: StudyPath[],
  days: Record<StudyPath, Record<string, DayData>>,
  done: Record<string, string>,
): MultiPathDayStatus {
  const pathStatuses: PathCompletionStatus[] = [];

  for (const path of activePaths) {
    const dayData = days[path]?.[date];
    if (!dayData || dayData.count === 0) {
      // Path doesn't have data for this date
      continue;
    }

    const prefix = `${path}:${date}:`;
    const doneCount = Object.keys(done).filter((key) =>
      key.startsWith(prefix),
    ).length;
    const totalCount = dayData.count;
    const percent = Math.round((doneCount / totalCount) * 100);
    const isComplete = doneCount >= totalCount;

    pathStatuses.push({
      path,
      percent,
      isComplete,
      doneCount,
      totalCount,
    });
  }

  // Compute aggregate status
  const completePaths = pathStatuses.filter((s) => s.isComplete);
  const incompletePaths = pathStatuses.filter((s) => !s.isComplete);
  const allComplete =
    pathStatuses.length > 0 && completePaths.length === pathStatuses.length;
  const hasAnyProgress = pathStatuses.some((s) => s.percent > 0);

  // Calculate aggregate percent for incomplete paths only
  let aggregateIncompletePercent: number | null = null;
  if (incompletePaths.length > 0) {
    const totalDone = incompletePaths.reduce((sum, s) => sum + s.doneCount, 0);
    const totalItems = incompletePaths.reduce(
      (sum, s) => sum + s.totalCount,
      0,
    );
    if (totalItems > 0) {
      aggregateIncompletePercent = Math.round((totalDone / totalItems) * 100);
    }
  }

  // Determine background color
  let bgColor: "green" | "orange" | "yellow" | "gray";
  if (pathStatuses.length === 0) {
    bgColor = "gray";
  } else if (allComplete) {
    bgColor = "green";
  } else if (completePaths.length > 0 && incompletePaths.length > 0) {
    // Mixed: some complete, some not
    bgColor = "orange";
  } else if (hasAnyProgress) {
    // Some progress but none complete
    bgColor = "yellow";
  } else {
    // No progress at all
    bgColor = "gray";
  }

  return {
    pathStatuses,
    bgColor,
    aggregateIncompletePercent,
    allComplete,
    hasAnyProgress,
  };
}

/**
 * Hook to compute multi-path completion status for a Hebrew month
 */
export function useMultiPathHebrewMonthCompletion(
  hebrewDays: HebrewDayData[],
): Record<string, MultiPathDayStatus> {
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);

  const result: Record<string, MultiPathDayStatus> = {};

  for (const dayData of hebrewDays) {
    const dateStr = dayData.gregorianDate;
    result[dateStr] = getMultiPathDayStatus(dateStr, activePaths, days, done);
  }

  return result;
}
