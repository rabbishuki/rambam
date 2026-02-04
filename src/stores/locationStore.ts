/**
 * Location store using Zustand with localStorage persistence
 * Manages user location and sunset time data
 * Persisted to localStorage so location survives page reloads
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SunsetData } from "@/types";
import { DEFAULT_COORDS } from "@/types";
import type { BilingualCityName } from "@/services/geocoding";

interface LocationStore {
  // Location data
  coords: { latitude: number; longitude: number };
  cityName: BilingualCityName;
  isManual: boolean;
  isDefault: boolean;

  // Whether user has completed location setup (asked for permission)
  hasCompletedSetup: boolean;

  // Sunset data
  sunset: SunsetData | null;

  // Last update timestamp
  updatedAt: string | null;

  // Actions
  setLocation: (
    coords: { latitude: number; longitude: number },
    cityName: BilingualCityName,
    isManual?: boolean,
    isDefault?: boolean,
  ) => void;
  setSunset: (sunset: SunsetData) => void;
  markLocationSetup: () => void;
  reset: () => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      // Initial state - no location set yet
      coords: DEFAULT_COORDS,
      cityName: { he: "", en: "" },
      isManual: false,
      isDefault: true,
      hasCompletedSetup: false,
      sunset: null,
      updatedAt: null,

      // Actions
      setLocation: (coords, cityName, isManual = false, isDefault = false) =>
        set({
          coords,
          cityName,
          isManual,
          isDefault,
          updatedAt: new Date().toISOString(),
        }),

      setSunset: (sunset) => set({ sunset }),

      markLocationSetup: () => set({ hasCompletedSetup: true }),

      reset: () =>
        set({
          coords: DEFAULT_COORDS,
          cityName: { he: "", en: "" },
          isManual: false,
          isDefault: true,
          hasCompletedSetup: false,
          sunset: null,
          updatedAt: null,
        }),
    }),
    {
      name: "rambam-location",
    },
  ),
);

/**
 * Format sunset time for display
 */
export function formatSunsetTime(sunset: SunsetData | null): string {
  if (!sunset) return "18:00";
  const hour = String(sunset.hour).padStart(2, "0");
  const minute = String(sunset.minute).padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * Get location display text
 */
export function getLocationDisplay(
  cityName: string,
  isDefault: boolean,
): string {
  const suffix = isDefault ? " (ברירת מחדל)" : "";
  return `מיקום: ${cityName}${suffix}`;
}
