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
  "7": [
    {
      he: "סימניות עם הערות - שמור הלכות והוסף הערות אישיות",
      en: "Bookmarks with notes - save halakhot and add personal annotations",
    },
    {
      he: 'סיכום יומי "מה למדתי" - כתוב מה למדת בסוף כל יום',
      en: '"What I Learned" daily summary - write reflections at day\'s end',
    },
    {
      he: "שיתוף התקדמות - שתף את הלימוד שלך עם hashtags",
      en: "Share progress - share your learning with hashtags",
    },
    {
      he: '"מה חדש" במדריך - משתמשים חוזרים רואים רק תכונות חדשות',
      en: '"What\'s New" tutorial mode - returning users see only new features',
    },
    {
      he: "כפתור סימניות בכותרת עם מספרון",
      en: "Bookmarks button in header with count badge",
    },
    {
      he: "חיווי סימנייה על כרטיסי הלכות",
      en: "Bookmark indicator on halakha cards",
    },
  ],
  "6": [
    {
      he: "לוח שנה עברי - תאריכים בעברית עם גימטריא (א׳, ב׳, י״ז...)",
      en: "Hebrew calendar - Jewish dates with gematriya (א׳, ב׳, י״ז...)",
    },
    {
      he: "ניווט לפי חודשים עבריים (שבט, אדר, ניסן...)",
      en: "Navigation by Hebrew months (Shevat, Adar, Nisan...)",
    },
    {
      he: "צבע רקע דינמי - משתנה בהתאם למצב (כחול/צהוב/אדום)",
      en: "Dynamic background color - changes based on status (blue/amber/red)",
    },
  ],
  "5": [
    {
      he: "ייצוא וייבוא נתונים - העבר התקדמות בין מכשירים",
      en: "Export/import data - transfer progress between devices",
    },
    {
      he: "גיבוי להורדה כקובץ JSON עם כל ההגדרות וההתקדמות",
      en: "Download backup as JSON file with all settings and progress",
    },
    {
      he: "ייבוא מקובץ גיבוי - שחזר את הנתונים במכשיר חדש",
      en: "Import from backup file - restore data on new device",
    },
  ],
  "4": [
    {
      he: "ארכיטקטורת אופליין-פירסט - האפליקציה עובדת ללא אינטרנט",
      en: "Offline-first architecture - app works without internet",
    },
    {
      he: "אחסון ב-IndexedDB - ללא מגבלת נפח",
      en: "IndexedDB storage - unlimited capacity",
    },
    {
      he: "הורדת תוכן מראש - הורד שבוע קדימה לשימוש אופליין",
      en: "Content prefetch - download week ahead for offline use",
    },
    {
      he: "סנכרון אוטומטי ברקע - תוכן מתעדכן בשקט",
      en: "Automatic background sync - content updates silently",
    },
    {
      he: "חיווי מצב אופליין - כותרת צהובה עם אייקון כשאין חיבור",
      en: "Offline status indicator - amber header with icon when disconnected",
    },
    {
      he: "תרגום מלא לאנגלית ועברית",
      en: "Full Hebrew and English translations",
    },
    {
      he: "לוח שנה עם חיווי התקדמות - וי ירוק להושלם, אחוז לחלקי",
      en: "Calendar with progress indicators - checkmark for complete, percentage for partial",
    },
    {
      he: "סינון לפי תאריך - לחיצה על תאריך בלוח מציגה רק אותו",
      en: "Date filtering - clicking a calendar date shows only that day",
    },
    {
      he: "חיווי ויזואלי בהחלקה - משוב מיידי לפעולות סימון",
      en: "Swipe visual feedback - immediate response to marking actions",
    },
    {
      he: "שאלת סימון אוטומטי - האם לסמן גם הלכות קודמות",
      en: "Auto-mark prompt - option to mark previous halakhot too",
    },
  ],
  "3": [
    {
      he: "מעבר ל-Next.js 16 ו-React 19",
      en: "Migrated to Next.js 16 and React 19",
    },
    {
      he: "תמיכה בספר המצוות - לימוד תרי״ג מצוות במחזור שנתי",
      en: "Sefer HaMitzvot support - 613 commandments yearly cycle",
    },
    {
      he: "שלושה מסלולי לימוד: 3 פרקים, פרק אחד, או ספר המצוות",
      en: "Three study paths: 3 chapters, 1 chapter, or Sefer HaMitzvot",
    },
    {
      he: "תצוגה דו-לשונית: עברית, אנגלית, או שניהם",
      en: "Bilingual display: Hebrew, English, or both",
    },
    {
      he: "אשף הגדרה ראשונית: שפה, מסלול, שפת טקסט, והעדפות",
      en: "Setup wizard: language, path, text language, and preferences",
    },
    {
      he: "פריסה אוטומטית ל-Cloudflare Workers",
      en: "Automated deployment to Cloudflare Workers",
    },
  ],
  "2": [
    {
      he: "כפתור להתקנת האפליקציה למסך הבית",
      en: "Install button to add app to home screen",
    },
    {
      he: "אפשרות לבחור אם לסמן הלכות קודמות אוטומטית או ידנית",
      en: "Option to auto-mark or manually mark previous halakhot",
    },
    {
      he: "גלילה אוטומטית להלכה הבאה לאחר סימון",
      en: "Auto-scroll to next halakha after marking",
    },
  ],
  "1": [
    {
      he: "בחירה בין פרק אחד ל-3 פרקים ליום",
      en: "Choose between 1 or 3 chapters per day",
    },
    {
      he: "לימוד עם המסלול הנוכחי או מהיום והלאה",
      en: "Study with current cycle or start from today",
    },
    {
      he: "תאריכי הלימוד מוצגים בעברית (לדוגמה: י״ז שבט)",
      en: "Hebrew dates displayed (e.g., 17 Shevat)",
    },
    {
      he: "זיהוי שקיעה מדויק על בסיס מיקום",
      en: "Accurate sunset detection based on location",
    },
    {
      he: "אייקון לוח השנה מאפשרת לצפות בכל תאריך ספציפי",
      en: "Calendar icon to view any specific date",
    },
    {
      he: "החלקה ימינה לסימון הלכה, שמאלה לביטול סימון או לחיצה כפולה",
      en: "Swipe right to mark, left to unmark, or double-tap",
    },
    {
      he: "סימון הלכה מתייחס גם לכל ההלכות הקודמות",
      en: "Marking a halakha also marks all previous ones",
    },
    {
      he: "מחיצות בין פרקים - מפריד ויזואלי בין פרק לפרק",
      en: "Visual chapter dividers between sections",
    },
    {
      he: "עדכון אוטומטי של כותרות - ההתקדמות מתעדכנת מיד",
      en: "Auto-updating headers with progress",
    },
  ],
  "0": [
    {
      he: 'אפליקציה לניהול לימוד רמב"ם יומי (3 פרקים)',
      en: "App for managing daily Rambam study (3 chapters)",
    },
    {
      he: "תמיכה בעברית מלאה מימין לשמאל",
      en: "Full Hebrew RTL support",
    },
    {
      he: "החלק הלכה ימינה כדי לסמן כהושלם",
      en: "Swipe halakha right to mark as complete",
    },
    {
      he: "כל המידע נשמר מקומית במכשיר",
      en: "All data saved locally on device",
    },
    {
      he: "התחלת יום עברי בשעה 18:00 שעון ישראל (שקיעה משוערת)",
      en: "Jewish day starts at 18:00 Israel time (estimated sunset)",
    },
    {
      he: "סטטיסטיקות - ימים שלמדתי, אחוז ההתקדמות של היום, הלכות להשלים",
      en: "Statistics - days studied, today's progress, halakhot remaining",
    },
    {
      he: "הגדרות - בחירת תאריך התחלה ואפשרות איפוס",
      en: "Settings - start date selection and reset option",
    },
    {
      he: "חיבור ל-API של ספריא לטעינת התוכן",
      en: "Connected to Sefaria API for content loading",
    },
  ],
};

/**
 * Contributors for each version
 * Maps version number to contributor info
 */
export const CONTRIBUTORS: Record<string, Contributor> = {
  "7": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.png",
  },
  "6": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.png",
  },
  "5": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "/contributors/meir.png",
  },
  "4": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "https://github.com/meirpro.png",
  },
  "3": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "https://github.com/meirpro.png",
  },
  "2": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/contributors/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
  },
  "1": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/contributors/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
  },
  "0": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/contributors/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
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
