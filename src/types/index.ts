// Study path options
export type StudyPath = "rambam3" | "rambam1" | "mitzvot";

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
  heDate?: string; // Hebrew date (e.g., "ט״ז שבט")
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
  studyPath: StudyPath;
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
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
  textLanguage: "hebrew",
  autoMarkPrevious: false, // Default to manual marking
  startDates: {
    rambam3: CYCLE_46_START,
    rambam1: CYCLE_46_START,
    mitzvot: CYCLE_46_START,
  },
};
