/**
 * Changelog Configuration
 *
 * Bilingual changelog entries for the Daily Rambam app.
 * Add new versions at the top - they will be sorted by version number.
 */

export interface ChangelogEntry {
  he: string;
  en: string;
}

export interface Contributor {
  name: { he: string; en: string };
  avatar: string;
  link?: string;
}

/**
 * Changelog entries by version number
 * Add new versions here - they will be displayed in descending order
 */
export const CHANGELOG: Record<string, ChangelogEntry[]> = {
  "3": [
    {
      he: "10 ערכות נושא עם בוחר צבעים ויזואלי",
      en: "10 color themes with visual theme picker",
    },
    {
      he: "הגדרת רוחב תוכן - צר, בינוני או מלא",
      en: "Content width setting - narrow, medium, or full",
    },
    {
      he: "תצוגת כרטיסים או רשימה",
      en: "Card or list view toggle",
    },
    {
      he: "פס מבטא צבעוני בכותרת לפי מצב - רגיל/אופליין/תאריך אחר",
      en: "Colored header accent bar by status - normal/offline/other date",
    },
    {
      he: "מדריך אינטראקטיבי עם נקודות התקדמות וניווט אחורה",
      en: "Interactive tutorial with progress dots and back navigation",
    },
    {
      he: "טופס משוב באפליקציה",
      en: "In-app feedback form",
    },
    {
      he: "תצוגת נפח אחסון בהגדרות",
      en: "Storage usage viewer in settings",
    },
  ],
  "2": [
    {
      he: "סימניות עם הערות אישיות",
      en: "Bookmarks with personal notes",
    },
    {
      he: 'סיכום יומי "מה למדתי"',
      en: '"What I Learned" daily summary',
    },
    {
      he: "שיתוף התקדמות",
      en: "Share progress",
    },
    {
      he: "ייצוא וייבוא נתונים בין מכשירים",
      en: "Export and import data between devices",
    },
    {
      he: "קישורים חיצוניים לספריא ו-Chabad.org",
      en: "External links to Sefaria and Chabad.org",
    },
    {
      he: "הסתרת פריטים שהושלמו - מיד, אחרי שעה, או אחרי 24 שעות",
      en: "Hide completed items - immediately, after 1h, or after 24h",
    },
    {
      he: "כפתור קפיצה להלכה הבאה שלא הושלמה",
      en: "Jump button to next unread halakha",
    },
    {
      he: "חיווי סימניות והערות בלוח השנה",
      en: "Bookmark and note indicators in calendar",
    },
  ],
  "1": [
    {
      he: "שלושה מסלולי לימוד: 3 פרקים, פרק אחד, וספר המצוות",
      en: "Three study paths: 3 chapters, 1 chapter, and Sefer HaMitzvot",
    },
    {
      he: "תצוגה דו-לשונית: עברית, אנגלית, או שניהם",
      en: "Bilingual display: Hebrew, English, or both",
    },
    {
      he: "החלקה שמאלה לסימון כל הקודמות, לחיצה כפולה לסימון",
      en: "Swipe left to mark all previous, double-tap to mark",
    },
    {
      he: "לוח שנה עברי עם תאריכי גימטריא וחיווי התקדמות",
      en: "Hebrew calendar with gematriya dates and progress indicators",
    },
    {
      he: "אופליין-פירסט - הורדת תוכן מראש וסנכרון ברקע",
      en: "Offline-first - content prefetch and background sync",
    },
    {
      he: "אשף הגדרה ראשונית",
      en: "First-time setup wizard",
    },
  ],
  "0": [
    {
      he: "הפרויקט המקורי של הרב שוקי - ההשראה לאפליקציה זו",
      en: "Rabbi Shuki's original project - the inspiration for this app",
    },
    {
      he: 'ניהול לימוד רמב"ם יומי עם תמיכה בעברית',
      en: "Daily Rambam study tracking with Hebrew support",
    },
    {
      he: "החלקה לסימון הלכות כהושלמו",
      en: "Swipe to mark halakhot as complete",
    },
    {
      he: "זיהוי שקיעה לפי מיקום - היום העברי מתחלף אוטומטית",
      en: "Location-based sunset detection - Jewish day updates automatically",
    },
    {
      he: "התקנה למסך הבית כאפליקציה",
      en: "Install to home screen as an app",
    },
    {
      he: "סרגל סטטיסטיקות",
      en: "Statistics bar",
    },
  ],
};

/**
 * Contributors for each version
 * Maps version number to contributor info
 */
export const CONTRIBUTORS: Record<string, Contributor> = {
  "3": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.webp",
  },
  "2": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.webp",
  },
  "1": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.webp",
  },
  "0": {
    name: { he: "הרב שוקי (השראה)", en: "Rabbi Shuki (Inspiration)" },
    avatar: "/contributors/rabbi.jpeg",
  },
};

/**
 * Get the latest version number
 */
export function getLatestVersion(): string {
  const versions = Object.keys(CHANGELOG).map(Number);
  return Math.max(...versions).toString();
}

/**
 * Get changelog entries sorted by version (descending)
 */
export function getSortedChangelog(): [string, ChangelogEntry[]][] {
  return Object.entries(CHANGELOG).sort(
    ([a], [b]) => parseInt(b) - parseInt(a),
  );
}
