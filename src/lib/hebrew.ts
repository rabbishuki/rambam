/**
 * Hebrew letter conversion utilities
 * Converts numbers to Hebrew letter notation (gematria)
 */

const HEBREW_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const HEBREW_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HEBREW_HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/**
 * Convert a number to Hebrew letter notation
 * Handles special cases for 15 (טו) and 16 (טז) to avoid spelling God's name
 * @param num - Number to convert (1-499)
 * @returns Hebrew letter representation
 */
export function toHebrewLetter(num: number): string {
  if (num < 1) return "";
  if (num > 499) return num.toString(); // Beyond our lookup tables

  let result = "";

  // Hundreds (up to 400 = ת)
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0 && hundreds < HEBREW_HUNDREDS.length) {
    result += HEBREW_HUNDREDS[hundreds];
  }

  // Handle remainder (tens and ones)
  const remainder = num % 100;

  // Special cases: 15 and 16 use טו and טז instead of יה and יו
  // to avoid spelling divine names
  if (remainder === 15) {
    result += "טו";
  } else if (remainder === 16) {
    result += "טז";
  } else if (remainder > 0) {
    if (remainder < 10) {
      result += HEBREW_ONES[remainder];
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      result += HEBREW_TENS[tens];
      if (ones > 0) {
        result += HEBREW_ONES[ones];
      }
    }
  }

  return result || num.toString();
}

/**
 * Format a Hebrew chapter title
 * @param chapterNum - Chapter number
 * @returns Formatted chapter string (e.g., "פרק א")
 */
export function formatChapterTitle(chapterNum: number): string {
  return `פרק ${toHebrewLetter(chapterNum)}`;
}
