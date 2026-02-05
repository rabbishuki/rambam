/**
 * Build a Sefaria URL for a given reference
 * Sefaria uses underscores for spaces in URLs
 */
export function sefariaUrl(ref: string): string {
  const encodedRef = encodeURIComponent(ref.replace(/ /g, "_"));
  return `https://www.sefaria.org/${encodedRef}`;
}

/**
 * Format a date string (YYYY-MM-DD) to Chabad.org format (M/D/YYYY)
 */
function formatDateForChabad(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  // Remove leading zeros
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  return `${m}/${d}/${year}`;
}

/**
 * Build a Chabad.org URL for Rambam daily study
 * @param date - Date in YYYY-MM-DD format
 * @param chapters - Number of chapters (1 or 3)
 */
export function chabadRambamUrl(date: string, chapters: 1 | 3 = 3): string {
  const tdate = formatDateForChabad(date);
  return `https://www.chabad.org/dailystudy/rambam.asp?rambamChapters=${chapters}&tdate=${tdate}`;
}

/**
 * Build a Chabad.org URL for Sefer HaMitzvot daily study
 * @param date - Date in YYYY-MM-DD format
 */
export function chabadMitzvotUrl(date: string): string {
  const tdate = formatDateForChabad(date);
  return `https://www.chabad.org/dailystudy/seferHamitzvos.asp?tdate=${tdate}`;
}
