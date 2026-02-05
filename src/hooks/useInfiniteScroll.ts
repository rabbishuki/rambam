/**
 * Hook for bi-directional infinite scroll in the calendar
 * Manages loading more months as user scrolls up or down
 */

import { useCallback, useRef, useState } from "react";
import {
  getHebrewMonthData,
  getPrevHebrewMonth,
  getNextHebrewMonth,
  type HebrewMonthData,
} from "@/lib/hebrewCalendar";

interface UseInfiniteScrollOptions {
  /** Gregorian date string (YYYY-MM-DD) for initial month */
  initialDate: string;
  /** Minimum date to allow scrolling back to */
  minDate?: string;
  /** Maximum date to allow scrolling forward to */
  maxDate?: string;
  /** Number of months to keep in the buffer on each side */
  bufferSize?: number;
}

interface UseInfiniteScrollResult {
  /** Array of Hebrew months to render */
  months: HebrewMonthData[];
  /** Load more months at the top (past) */
  loadPreviousMonths: () => void;
  /** Load more months at the bottom (future) */
  loadNextMonths: () => void;
  /** Scroll to a specific date */
  scrollToDate: (date: string) => void;
  /** Check if we can load more previous months */
  canLoadPrevious: boolean;
  /** Check if we can load more next months */
  canLoadNext: boolean;
  /** Index of the month containing today */
  todayMonthIndex: number;
  /** Ref for the scroll container */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Get Hebrew month from a date string
 */
function getMonthFromDateString(dateStr: string): HebrewMonthData {
  const [year, month, day] = dateStr.split("-").map(Number);
  return getHebrewMonthData(new Date(year, month - 1, day));
}

/**
 * Check if a month contains a specific date
 */
function monthContainsDate(month: HebrewMonthData, dateStr: string): boolean {
  return month.days.some((day) => day.gregorianDate === dateStr);
}

/**
 * Check if a month is before a given date
 */
function isMonthBeforeDate(month: HebrewMonthData, dateStr: string): boolean {
  // Get the last day of the month
  const lastDay = month.days[month.days.length - 1];
  return lastDay.gregorianDate < dateStr;
}

/**
 * Check if a month is after a given date
 */
function isMonthAfterDate(month: HebrewMonthData, dateStr: string): boolean {
  // Get the first day of the month
  const firstDay = month.days[0];
  return firstDay.gregorianDate > dateStr;
}

export function useInfiniteScroll({
  initialDate,
  minDate,
  maxDate,
  bufferSize = 2,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize with months around the initial date
  const [months, setMonths] = useState<HebrewMonthData[]>(() => {
    const centerMonth = getMonthFromDateString(initialDate);
    const result: HebrewMonthData[] = [centerMonth];

    // Add previous months
    let prevMonth = centerMonth;
    for (let i = 0; i < bufferSize; i++) {
      prevMonth = getPrevHebrewMonth(prevMonth);
      // Don't add months that end before minDate
      if (minDate && isMonthBeforeDate(prevMonth, minDate)) break;
      result.unshift(prevMonth);
    }

    // Add next months
    let nextMonth = centerMonth;
    for (let i = 0; i < bufferSize; i++) {
      nextMonth = getNextHebrewMonth(nextMonth);
      // Don't add months that start after maxDate
      if (maxDate && isMonthAfterDate(nextMonth, maxDate)) break;
      result.push(nextMonth);
    }

    return result;
  });

  // Find the index of the month containing today
  const todayMonthIndex = months.findIndex((month) =>
    monthContainsDate(month, initialDate),
  );

  // Check if we can load more months
  const canLoadPrevious =
    !minDate || !isMonthBeforeDate(getPrevHebrewMonth(months[0]), minDate);

  const canLoadNext =
    !maxDate ||
    !isMonthAfterDate(getNextHebrewMonth(months[months.length - 1]), maxDate);

  // Load previous months (scroll up)
  const loadPreviousMonths = useCallback(() => {
    setMonths((current) => {
      if (current.length === 0) return current;

      const firstMonth = current[0];
      const newMonths: HebrewMonthData[] = [];

      let prevMonth = firstMonth;
      for (let i = 0; i < bufferSize; i++) {
        prevMonth = getPrevHebrewMonth(prevMonth);
        // Don't add months that end before minDate
        if (minDate && isMonthBeforeDate(prevMonth, minDate)) break;
        newMonths.unshift(prevMonth);
      }

      if (newMonths.length === 0) return current;

      // Keep the total number of months reasonable by trimming from the end
      const combined = [...newMonths, ...current];
      const maxMonths = bufferSize * 4 + 1;
      if (combined.length > maxMonths) {
        return combined.slice(0, maxMonths);
      }
      return combined;
    });
  }, [bufferSize, minDate]);

  // Load next months (scroll down)
  const loadNextMonths = useCallback(() => {
    setMonths((current) => {
      if (current.length === 0) return current;

      const lastMonth = current[current.length - 1];
      const newMonths: HebrewMonthData[] = [];

      let nextMonth = lastMonth;
      for (let i = 0; i < bufferSize; i++) {
        nextMonth = getNextHebrewMonth(nextMonth);
        // Don't add months that start after maxDate
        if (maxDate && isMonthAfterDate(nextMonth, maxDate)) break;
        newMonths.push(nextMonth);
      }

      if (newMonths.length === 0) return current;

      // Keep the total number of months reasonable by trimming from the start
      const combined = [...current, ...newMonths];
      const maxMonths = bufferSize * 4 + 1;
      if (combined.length > maxMonths) {
        return combined.slice(combined.length - maxMonths);
      }
      return combined;
    });
  }, [bufferSize, maxDate]);

  // Scroll to a specific date
  const scrollToDate = useCallback(
    (date: string) => {
      // First, check if the date is in the current months
      const monthIndex = months.findIndex((month) =>
        monthContainsDate(month, date),
      );

      if (monthIndex !== -1) {
        // Month is already loaded, scroll to it
        const monthElement = containerRef.current?.querySelector(
          `[data-month-index="${monthIndex}"]`,
        );
        monthElement?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // Month is not loaded, we need to reset months around the target date
      const targetMonth = getMonthFromDateString(date);
      const result: HebrewMonthData[] = [targetMonth];

      // Add previous months
      let prevMonth = targetMonth;
      for (let i = 0; i < bufferSize; i++) {
        prevMonth = getPrevHebrewMonth(prevMonth);
        if (minDate && isMonthBeforeDate(prevMonth, minDate)) break;
        result.unshift(prevMonth);
      }

      // Add next months
      let nextMonth = targetMonth;
      for (let i = 0; i < bufferSize; i++) {
        nextMonth = getNextHebrewMonth(nextMonth);
        if (maxDate && isMonthAfterDate(nextMonth, maxDate)) break;
        result.push(nextMonth);
      }

      setMonths(result);

      // Scroll to the target month after state update
      requestAnimationFrame(() => {
        const newMonthIndex = result.findIndex((month) =>
          monthContainsDate(month, date),
        );
        const monthElement = containerRef.current?.querySelector(
          `[data-month-index="${newMonthIndex}"]`,
        );
        monthElement?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    },
    [months, minDate, maxDate, bufferSize],
  );

  return {
    months,
    loadPreviousMonths,
    loadNextMonths,
    scrollToDate,
    canLoadPrevious,
    canLoadNext,
    todayMonthIndex,
    containerRef,
  };
}
