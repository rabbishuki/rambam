/**
 * Build a Sefaria URL for a given reference
 * Sefaria uses underscores for spaces in URLs
 */
export function sefariaUrl(ref: string): string {
  const encodedRef = encodeURIComponent(ref.replace(/ /g, "_"));
  return `https://www.sefaria.org/${encodedRef}`;
}

/**
 * Convert TextLanguage setting to Sefaria lang parameter
 */
export type SefariaLang = "he" | "en" | "bi";

export function textLanguageToSefariaLang(
  textLanguage: "hebrew" | "english" | "both",
): SefariaLang {
  switch (textLanguage) {
    case "hebrew":
      return "he";
    case "english":
      return "en";
    case "both":
      return "bi";
  }
}

/**
 * Build a Sefaria URL that links directly to a specific halacha
 * Sefaria format: Book_Name.Chapter.Halacha?lang=bi
 *
 * @param baseRef - Full reference like "Mishneh Torah, Human Dispositions 1-3"
 * @param halakhaIndex - 0-based index of the halacha in the day's list
 * @param chapterBreaks - Indices where new chapters start (e.g., [23, 43])
 * @param lang - Sefaria language parameter (he, en, bi)
 */
export function sefariaHalakhaUrl(
  baseRef: string,
  halakhaIndex: number,
  chapterBreaks?: number[],
  lang: SefariaLang = "bi",
): string {
  // Parse the base reference to get book name and chapter(s)
  // "Mishneh Torah, Human Dispositions 1-3" -> book: "Mishneh Torah, Human Dispositions", start: 1
  const match = baseRef.match(/^(.+)\s+(\d+)(?:-(\d+))?$/);

  if (!match) {
    // Fallback to base URL if we can't parse (e.g., intro sections)
    return sefariaUrl(baseRef);
  }

  const bookName = match[1];
  const startChapter = parseInt(match[2], 10);

  let chapter: number;
  let halakhaNum: number;

  if (!chapterBreaks || chapterBreaks.length === 0) {
    // Single chapter case
    chapter = startChapter;
    halakhaNum = halakhaIndex + 1;
  } else {
    // Multiple chapters: determine which chapter and halacha number within it
    // chapterBreaks contains indices where chapters 2, 3, etc. start
    // e.g., [23, 43] means: chapter 1 has indices 0-22, chapter 2 has 23-42, chapter 3 has 43+

    // Check if halakhaIndex is in the first chapter (before any break)
    if (halakhaIndex < chapterBreaks[0]) {
      chapter = startChapter;
      halakhaNum = halakhaIndex + 1;
    } else {
      // Find which chapter (offset from start)
      let chapterOffset = 1; // At least chapter 2 since we're past chapterBreaks[0]
      for (let i = 1; i < chapterBreaks.length; i++) {
        if (halakhaIndex < chapterBreaks[i]) {
          break;
        }
        chapterOffset = i + 1;
      }

      chapter = startChapter + chapterOffset;
      const chapterStartIndex = chapterBreaks[chapterOffset - 1];
      halakhaNum = halakhaIndex - chapterStartIndex + 1;
    }
  }

  // Build URL with dot notation: Book_Name.Chapter.Halacha?lang=xx
  const encodedBook = encodeURIComponent(bookName.replace(/ /g, "_"));
  return `https://www.sefaria.org/${encodedBook}.${chapter}.${halakhaNum}?lang=${lang}`;
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
