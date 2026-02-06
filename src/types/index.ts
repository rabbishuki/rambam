// Study path options
export type StudyPath = "rambam3" | "rambam1" | "mitzvot";

// Theme options
export type ThemeId = "teal" | "sky" | "lavender" | "rose" | "sage" | "dark";
export type HeaderStyle = "minimal" | "glass";
export type CardStyle = "list" | "cards";

// Hide completed mode options
export type HideCompletedMode = "show" | "immediate" | "after1h" | "after24h";

// Sefaria calendar name mapping
// - "Daily Rambam (3 Chapters)" = 3 chapters per day
// - "Daily Rambam" = 1 chapter per day (NOT "Daily Rambam (1 Chapter)")
// - Sefer HaMitzvot uses HebCal for schedule + Sefaria for text content
export const SEFARIA_CALENDAR_NAMES: Record<StudyPath, string> = {
  rambam3: "Daily Rambam (3 Chapters)",
  rambam1: "Daily Rambam",
  mitzvot: "Sefer HaMitzvot", // Uses HebCal calendar, Sefaria text
};

// Language display options
export type TextLanguage = "hebrew" | "english" | "both";

// Single halakha/mitzvah text
export interface HalakhaText {
  he: string;
  en?: string;
  chapter: number;
  isFirstInChapter: boolean;
}

// Day data from Sefaria/HebCal calendar
export interface DayData {
  he: string; // Hebrew display text (e.g., "הלכות דעות פרק א-ג")
  en?: string; // English display text
  ref: string; // Primary Sefaria reference (e.g., "Mishneh Torah, Human Dispositions 1-3")
  refs?: string[]; // Multiple refs for Sefer HaMitzvot (each commandment)
  count: number; // Number of halakhot/mitzvot
  heDate?: string; // Hebrew date in Hebrew (e.g., "י״ז שבט")
  enDate?: string; // Hebrew date in English (e.g., "17 Sh'vat")
  texts?: HalakhaText[]; // Cached text content
  chapterBreaks?: number[]; // Indices where new chapters start
}

// Completion tracking - "path:date:index" → ISO timestamp
export type CompletionMap = Record<string, string>;

// Location data with caching info
export interface StoredLocation {
  coords: {
    latitude: number;
    longitude: number;
  };
  cityName: string;
  isManual: boolean;
  updatedAt: string;
}

// Sunset time data
export interface SunsetData {
  hour: number;
  minute: number;
  date: string; // The date this sunset applies to
}

// App settings - persisted
export interface AppSettings {
  studyPath: StudyPath; // Legacy: primary path (kept for backward compatibility)
  activePaths: StudyPath[]; // NEW: Multiple paths can be active simultaneously
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
  hideCompleted: HideCompletedMode; // NEW: Hide completed days/items setting
  daysAhead: number; // Days to prefetch ahead for offline (1-14, default 7)
  theme: ThemeId;
  headerStyle: HeaderStyle;
  cardStyle: CardStyle;
  // Per-path start dates (allows switching paths while preserving progress)
  startDates: {
    rambam3: string;
    rambam1: string;
    mitzvot: string;
  };
}

// Full app state
export interface AppState extends AppSettings {
  // Per-path day data
  days: Record<StudyPath, Record<string, DayData>>;
  // Completion tracking: "path:date:index" → ISO timestamp
  done: CompletionMap;
}

// Location store state
export interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  cityName: string;
  isManual: boolean;
  sunset: SunsetData | null;
  updatedAt: string | null;
}

// Stats derived from app state
export interface Stats {
  completedDays: number;
  totalDays: number;
  todayPercent: number;
  backlog: number;
}

// Bookmark - saved halakha with optional personal note
export interface Bookmark {
  id: string; // "path:date:index"
  path: StudyPath;
  date: string;
  index: number;
  note?: string; // Personal annotation
  createdAt: string;
  updatedAt: string;
  titleHe: string; // Cached for list display
  titleEn?: string;
  ref: string; // Sefaria reference
}

// Map of bookmark ID to Bookmark
export type BookmarksMap = Record<string, Bookmark>;

// Day summary - "What I Learned" reflection
export interface DaySummary {
  id: string; // "path:date"
  path: StudyPath;
  date: string;
  text: string; // User's summary
  createdAt: string;
  updatedAt: string;
}

// Map of summary ID to DaySummary
export type SummariesMap = Record<string, DaySummary>;

// Default coordinates (Tel Aviv)
export const DEFAULT_COORDS = {
  latitude: 32.0853,
  longitude: 34.7818,
};

// Cycle 46 start date (Tu B'Shvat 5786 / Feb 3, 2026)
export const CYCLE_46_START = "2026-02-03";

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  studyPath: "rambam3",
  activePaths: ["rambam3"], // Default: single path matching studyPath
  textLanguage: "hebrew",
  autoMarkPrevious: false, // Default to manual marking
  hideCompleted: "after24h", // Default: hide completed after 24 hours
  daysAhead: 3, // Prefetch 3 days ahead by default
  theme: "teal",
  headerStyle: "minimal",
  cardStyle: "list",
  startDates: {
    rambam3: CYCLE_46_START,
    rambam1: CYCLE_46_START,
    mitzvot: CYCLE_46_START,
  },
};
