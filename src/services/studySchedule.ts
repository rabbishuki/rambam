/**
 * Local study schedule + Hebrew date computation using @hebcal/core + @hebcal/learning
 *
 * - Sefer HaMitzvot schedule: computed locally (replaces HebCal API)
 * - Hebrew dates: computed locally (replaces HebCal converter API)
 * - Rambam 1 & 3 schedules: still use Sefaria Calendar API (refs guaranteed to match)
 */

import { HDate, DailyLearning } from "@hebcal/core";
// Side-effect import: registers schedule lookups (rambam1, rambam3, seferHaMitzvot, etc.)
// on the DailyLearning singleton. Must be imported before any DailyLearning.lookup() call.
import "@hebcal/learning";
import type { DayData } from "@/types";

// Duck-typed because @hebcal/learning doesn't export SeferHaMitzvotEvent.
// We only need render() for display text and reading.reading for ref construction.
interface MitzvotEvent {
  render(locale?: string): string;
  reading: { day: number; reading: string };
}

/**
 * Compute Hebrew date strings from a YYYY-MM-DD date.
 * Pure local computation — no network needed.
 */
export function computeHebrewDate(dateStr: string): {
  heDate: string;
  enDate: string;
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  const hd = new HDate(new Date(y, m - 1, d));
  // renderGematriya(true) gives "כ״א שבט תשפ״ו" — strip the year
  const full = hd.renderGematriya(true);
  const parts = full.split(" ");
  const heDate = parts.slice(0, -1).join(" "); // "כ״א שבט"
  const enDate = `${hd.getDate()} ${hd.getMonthName()}`; // "21 Sh'vat"
  return { heDate, enDate };
}

/**
 * Parse Sefer HaMitzvot reading string into Sefaria refs.
 * Handles: "P3, P4, P9" | "Principle 1-3" | "Maimonides' Introduction..."
 *
 * Decision: We construct Sefaria refs from HebCal's reading codes rather than
 * using an API because Sefer HaMitzvot refs follow a predictable pattern:
 * P/N prefix → Positive/Negative Commandments, "Principle" → Shorashim.
 * These refs are stable across Sefaria's catalog and don't change.
 */
function parseMitzvotReading(reading: string): string[] {
  // Handle "Maimonides' Introduction to Sefer Hamitzvot"
  if (reading.includes("Introduction to Sefer Hamitzvot")) {
    return ["Sefer HaMitzvot, Introductions, The Rambam's Introduction"];
  }

  // Handle "Principle X-Y" (Shorashim/Roots)
  const principleMatch = reading.match(/Principle (\d+)(?:-(\d+))?/);
  if (principleMatch) {
    const start = principleMatch[1];
    const end = principleMatch[2];
    if (end) {
      return [`Sefer HaMitzvot, Shorashim ${start}-${end}`];
    }
    return [`Sefer HaMitzvot, Shorashim ${start}`];
  }

  // Handle comma-separated commandment codes: "P3, P4, P9" or "N10, N47, P186"
  const refs: string[] = [];
  const codes = reading.split(/,\s*/);

  for (const code of codes) {
    const trimmed = code.trim();
    const negMatch = trimmed.match(/^N(\d+)$/);
    if (negMatch) {
      refs.push(`Sefer HaMitzvot, Negative Commandments ${negMatch[1]}`);
      continue;
    }
    const posMatch = trimmed.match(/^P(\d+)$/);
    if (posMatch) {
      refs.push(`Sefer HaMitzvot, Positive Commandments ${posMatch[1]}`);
      continue;
    }
  }

  return refs;
}

/**
 * Resolve Sefer HaMitzvot schedule for a given date.
 * Pure local computation — no network, no cache.
 *
 * @param dateStr - Gregorian date (YYYY-MM-DD)
 * @returns Schedule data with display text, refs, and Hebrew dates
 */
export function resolveMitzvotSchedule(dateStr: string): Pick<
  DayData,
  "he" | "en" | "ref" | "heDate" | "enDate"
> & {
  refs: string[];
} {
  const [y, m, d] = dateStr.split("-").map(Number);
  const hd = new HDate(new Date(y, m - 1, d));
  const { heDate, enDate } = computeHebrewDate(dateStr);

  // 3rd arg `false` = return single event (not array). Cast needed because
  // @hebcal/learning types don't narrow to SeferHaMitzvotEvent.
  const event = DailyLearning.lookup(
    "seferHaMitzvot",
    hd,
    false,
  ) as MitzvotEvent | null;
  if (!event) {
    throw new Error(`No Sefer HaMitzvot schedule for ${hd.toString()}`);
  }

  const reading = event.reading;
  const refs = parseMitzvotReading(reading.reading);

  return {
    he: `ספר המצוות - יום ${reading.day}`,
    en: event.render("en"),
    ref: refs[0] || `Sefer HaMitzvot Day ${reading.day}`,
    refs,
    heDate,
    enDate,
  };
}
