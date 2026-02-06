/**
 * Real connectivity check that pings Sefaria to verify internet access.
 * navigator.onLine only checks if a network adapter is connected —
 * it returns true on captive portals, firewalled WiFi, etc.
 * This module does an actual HEAD request to confirm reachability.
 */

const PING_URL = "https://www.sefaria.org/api/calendars";
const PING_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 30_000; // cache result for 30 seconds

let cachedResult: boolean | null = null;
let cachedAt = 0;

/**
 * Quick pre-check using navigator.onLine.
 * If the adapter is disconnected we can skip the ping entirely.
 */
function browserSaysOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Ping Sefaria with a HEAD request + AbortController timeout.
 * Returns true if the server responds (any HTTP status), false on network error.
 */
async function pingSefaria(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const res = await fetch(PING_URL, {
      method: "HEAD",
      mode: "no-cors", // avoids CORS issues — opaque response is fine
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);
    // With no-cors, a successful fetch returns an opaque response (type "opaque", status 0).
    // A network failure throws, so reaching here means the server is reachable.
    return res.type === "opaque" || res.ok;
  } catch {
    return false;
  }
}

/**
 * Check real internet connectivity.
 *
 * 1. If navigator.onLine is false → return false immediately (reliable signal).
 * 2. If we have a cached result younger than CACHE_TTL_MS → return it.
 * 3. Otherwise ping Sefaria and cache the result.
 *
 * Use this instead of `navigator.onLine` everywhere in the app.
 */
export async function isReachable(): Promise<boolean> {
  // Fast path: adapter disconnected
  if (browserSaysOffline()) {
    cachedResult = false;
    cachedAt = Date.now();
    return false;
  }

  // Return cached result if fresh
  if (cachedResult !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }

  const reachable = await pingSefaria();
  cachedResult = reachable;
  cachedAt = Date.now();
  return reachable;
}

/**
 * Synchronous quick check — uses cached result if available,
 * otherwise falls back to navigator.onLine.
 * Prefer `isReachable()` when you can await.
 */
export function isLikelyOnline(): boolean {
  if (browserSaysOffline()) return false;
  if (cachedResult !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }
  // No cache — fall back to navigator.onLine (best we can do synchronously)
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Invalidate the cache (e.g., when the browser fires an online/offline event).
 */
export function invalidateCache(): void {
  cachedResult = null;
  cachedAt = 0;
}
