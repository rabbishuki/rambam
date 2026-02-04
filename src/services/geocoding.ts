/**
 * Geocoding service
 * Handles reverse geocoding (coordinates to city name)
 * Returns bilingual names (Hebrew and English) when available
 */

import { DEFAULT_COORDS } from "@/types";

interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  countryName?: string;
}

export interface BilingualCityName {
  he: string;
  en: string;
}

/**
 * Reverse geocode coordinates to get city name in a specific language
 */
async function reverseGeocodeWithLang(
  coords: { latitude: number; longitude: number },
  lang: "he" | "en",
): Promise<string> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=${lang}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data: BigDataCloudResponse = await res.json();
  const fallback = lang === "he" ? "מיקום נוכחי" : "Current Location";

  return data.locality || data.city || data.principalSubdivision || fallback;
}

/**
 * Reverse geocode coordinates to get city name in both Hebrew and English
 * Uses BigDataCloud's free API (no API key required)
 * @param coords - Latitude and longitude
 * @returns City names in Hebrew and English
 */
export async function reverseGeocode(coords: {
  latitude: number;
  longitude: number;
}): Promise<BilingualCityName> {
  try {
    // Fetch both languages in parallel
    const [he, en] = await Promise.all([
      reverseGeocodeWithLang(coords, "he"),
      reverseGeocodeWithLang(coords, "en"),
    ]);

    console.log("[Geocoding] Reverse geocoded:", { coords, he, en });

    return { he, en };
  } catch (error) {
    console.error("Failed to reverse geocode:", error);
    return { he: "מיקום נוכחי", en: "Current Location" };
  }
}

/**
 * Legacy function for backward compatibility - returns Hebrew name
 * @deprecated Use reverseGeocode() which returns bilingual names
 */
export async function reverseGeocodeHebrew(coords: {
  latitude: number;
  longitude: number;
}): Promise<string> {
  const result = await reverseGeocode(coords);
  return result.he;
}

/**
 * Get user's current location using browser geolocation API
 * Falls back to Tel Aviv if geolocation is unavailable or denied
 * @returns Coordinates and whether default was used
 */
export async function getUserLocation(): Promise<{
  coords: { latitude: number; longitude: number };
  isDefault: boolean;
}> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported, using Tel Aviv");
      resolve({ coords: DEFAULT_COORDS, isDefault: true });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          isDefault: false,
        });
      },
      (error) => {
        console.log("Geolocation error:", error.message, "- using Tel Aviv");
        resolve({ coords: DEFAULT_COORDS, isDefault: true });
      },
      { timeout: 5000 },
    );
  });
}

/**
 * Get location with city name (bilingual)
 * Combines geolocation with reverse geocoding
 */
export async function getLocationWithName(): Promise<{
  coords: { latitude: number; longitude: number };
  cityName: BilingualCityName;
  isDefault: boolean;
}> {
  const { coords, isDefault } = await getUserLocation();

  // If using default location, return Tel Aviv name directly
  if (isDefault) {
    return {
      coords,
      cityName: { he: "תל אביב", en: "Tel Aviv" },
      isDefault: true,
    };
  }

  // Otherwise, get the actual city name in both languages
  const cityName = await reverseGeocode(coords);

  return {
    coords,
    cityName,
    isDefault: false,
  };
}
