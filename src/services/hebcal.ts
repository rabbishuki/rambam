/**
 * Hebcal API service
 * Fetches sunset times (GPS-based, requires network)
 *
 * Decision: Only fetchSunset remains here. Hebrew dates and study schedules were
 * moved to studySchedule.ts (local computation via @hebcal/core + @hebcal/learning).
 * Sunset times still need the HebCal Zmanim API because computing sunrise/sunset
 * requires GPS coordinates + astronomical calculations that @hebcal/core doesn't provide.
 */

import type { SunsetData } from "@/types";

const HEBCAL_API = "https://www.hebcal.com";

interface HebcalZmanimResponse {
  times?: {
    sunset?: string;
  };
}

/**
 * Fetch sunset time for a given date and location
 * @param dateStr - Date string (YYYY-MM-DD)
 * @param coords - Latitude and longitude
 * @returns Sunset data with hour and minute
 */
export async function fetchSunset(
  dateStr: string,
  coords: { latitude: number; longitude: number },
): Promise<SunsetData> {
  const url = `${HEBCAL_API}/zmanim?cfg=json&latitude=${coords.latitude}&longitude=${coords.longitude}&date=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Zmanim API failed: ${res.status}`);
  }

  const data: HebcalZmanimResponse = await res.json();

  if (data.times?.sunset) {
    // Parse time directly from ISO string to avoid timezone conversion
    // HebCal returns time in the location's timezone, we want to display that exact time
    // e.g., "2026-02-04T17:16:00+02:00" - extract 17:16 directly
    const isoString = data.times.sunset;
    const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);

    if (timeMatch) {
      return {
        hour: parseInt(timeMatch[1], 10),
        minute: parseInt(timeMatch[2], 10),
        date: dateStr,
      };
    }

    // Fallback: use Date parsing (but this may have timezone issues)
    const sunsetTime = new Date(isoString);
    return {
      hour: sunsetTime.getHours(),
      minute: sunsetTime.getMinutes(),
      date: dateStr,
    };
  }

  // Fallback to 18:00 if no sunset data
  return {
    hour: 18,
    minute: 0,
    date: dateStr,
  };
}
