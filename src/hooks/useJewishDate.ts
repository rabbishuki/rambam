/**
 * Hook for getting the current Jewish date
 * Accounts for sunset-based day boundaries
 *
 * Auto-updates on:
 *  - Sunset crossing (timer re-arms each day)
 *  - Tab becoming visible after being hidden
 *  - Civil midnight (triggers sunset data refresh for new day)
 *  - Stale sunset data (date mismatch → refetch from Hebcal)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { getJewishDate, getLocalDate } from "@/lib/dates";
import { fetchSunset } from "@/services/hebcal";

/**
 * Calculate milliseconds until a given hour:minute today (local time).
 * Returns null if that time has already passed.
 */
function getMsUntil(hour: number, minute: number): number | null {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  const diff = target.getTime() - now.getTime();
  return diff > 0 ? diff : null;
}

/**
 * Calculate milliseconds until local midnight (00:00 of next civil day).
 */
function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Returns the current Jewish date, accounting for sunset.
 * Automatically updates when sunset passes, tab becomes visible,
 * or a new civil day starts (midnight).
 */
export function useJewishDate(): string {
  const sunset = useLocationStore((state) => state.sunset);
  const coords = useLocationStore((state) => state.coords);
  const setSunset = useLocationStore((state) => state.setSunset);

  // Tick counter: bumping this forces getJewishDate() to re-evaluate
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // 1. Visibility listener — re-evaluate when tab becomes visible
  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        bump();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [bump]);

  // 2. Sunset timer — fires at sunset + 1s, then re-arms via tick dep
  useEffect(() => {
    if (!sunset) return;

    const ms = getMsUntil(sunset.hour, sunset.minute);
    if (ms === null) return; // Already past sunset

    const timerId = setTimeout(bump, ms + 1000);
    return () => clearTimeout(timerId);
  }, [sunset, tick, bump]);

  // 3. Midnight timer — fires at 00:00 + 1s, triggers tick for new civil day
  useEffect(() => {
    const ms = getMsUntilMidnight();
    const timerId = setTimeout(bump, ms + 1000);
    return () => clearTimeout(timerId);
  }, [tick, bump]);

  // 4. Stale sunset refresh — if sunset.date doesn't match today's civil date,
  //    fetch fresh sunset data for the current day
  useEffect(() => {
    if (!sunset || !coords) return;

    const today = getLocalDate();
    if (sunset.date === today) return; // Still current

    let cancelled = false;
    fetchSunset(today, coords)
      .then((fresh) => {
        if (!cancelled) {
          setSunset(fresh);
        }
      })
      .catch((err) => {
        console.error("Failed to refresh sunset data:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [sunset, coords, setSunset, tick]);

  // Recalculate date whenever tick or sunset changes
  const jewishDate = useMemo(() => {
    void tick; // used to trigger recalculation
    return getJewishDate(sunset);
  }, [sunset, tick]);

  return jewishDate;
}

/**
 * Returns whether a given date is today (in Jewish calendar terms)
 */
export function useIsToday(dateStr: string): boolean {
  const today = useJewishDate();
  return dateStr === today;
}
