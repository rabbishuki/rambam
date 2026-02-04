/**
 * Hook for getting the current Jewish date
 * Accounts for sunset-based day boundaries
 * Automatically updates when sunset passes
 */

import { useState, useEffect, useMemo } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { getJewishDate } from "@/lib/dates";
import type { SunsetData } from "@/types";

/**
 * Calculate milliseconds until sunset today
 * Returns null if sunset has already passed
 */
function getMsUntilSunset(sunset: SunsetData): number | null {
  const now = new Date();
  const israelTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Jerusalem",
  });
  const israelTime = new Date(israelTimeStr);

  const currentHour = israelTime.getHours();
  const currentMinute = israelTime.getMinutes();

  // If already past sunset, return null
  if (
    currentHour > sunset.hour ||
    (currentHour === sunset.hour && currentMinute >= sunset.minute)
  ) {
    return null;
  }

  // Calculate ms until sunset
  const sunsetTime = new Date(israelTime);
  sunsetTime.setHours(sunset.hour, sunset.minute, 0, 0);

  return sunsetTime.getTime() - israelTime.getTime();
}

/**
 * Returns the current Jewish date, accounting for sunset
 * The Jewish day starts at sunset, so after sunset we're in the "next" day
 * Automatically updates when sunset passes
 */
export function useJewishDate(): string {
  const sunset = useLocationStore((state) => state.sunset);

  // Track if we've passed sunset (triggers re-render)
  const [sunsetPassed, setSunsetPassed] = useState(false);

  // Set up timer to trigger update at sunset
  useEffect(() => {
    if (!sunset) return;

    const msUntilSunset = getMsUntilSunset(sunset);

    if (msUntilSunset === null) {
      // Already past sunset, no timer needed today
      return;
    }

    // Add a small buffer (1 second) to ensure we're past sunset
    const timerId = setTimeout(() => {
      setSunsetPassed(true);
    }, msUntilSunset + 1000);

    return () => clearTimeout(timerId);
  }, [sunset]);

  // Recalculate date when sunsetPassed changes
  const jewishDate = useMemo(() => {
    // sunsetPassed is used to trigger recalculation
    void sunsetPassed;
    return getJewishDate(sunset);
  }, [sunset, sunsetPassed]);

  return jewishDate;
}

/**
 * Returns whether a given date is today (in Jewish calendar terms)
 */
export function useIsToday(dateStr: string): boolean {
  const today = useJewishDate();
  return dateStr === today;
}
