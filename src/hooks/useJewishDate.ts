/**
 * Hook for getting the current Jewish date
 * Accounts for sunset-based day boundaries
 */

import { useMemo } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { getJewishDate } from "@/lib/dates";

/**
 * Returns the current Jewish date, accounting for sunset
 * The Jewish day starts at sunset, so after sunset we're in the "next" day
 */
export function useJewishDate(): string {
  const sunset = useLocationStore((state) => state.sunset);

  return useMemo(() => {
    return getJewishDate(sunset);
  }, [sunset]);
}

/**
 * Returns whether a given date is today (in Jewish calendar terms)
 */
export function useIsToday(dateStr: string): boolean {
  const today = useJewishDate();
  return dateStr === today;
}
