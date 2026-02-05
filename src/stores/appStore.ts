/**
 * Main application store using Zustand
 * Manages settings, day data, and completion tracking
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  StudyPath,
  TextLanguage,
  HideCompletedMode,
  DayData,
  CompletionMap,
  AppSettings,
  Bookmark,
  BookmarksMap,
  DaySummary,
  SummariesMap,
} from "@/types";
import { DEFAULT_SETTINGS, CYCLE_46_START } from "@/types";

interface AppStore extends AppSettings {
  // Per-path day data
  days: Record<StudyPath, Record<string, DayData>>;
  // Completion tracking: "path:date:index" → ISO timestamp
  done: CompletionMap;
  // Bookmarks: "path:date:index" → Bookmark
  bookmarks: BookmarksMap;
  // Day summaries: "path:date" → DaySummary
  summaries: SummariesMap;
  // Migration flag
  hasMigratedLegacy: boolean;
  // Has user seen the auto-mark prompt (first time marking multiple)
  hasSeenAutoMarkPrompt: boolean;

  // Settings actions
  setStudyPath: (path: StudyPath) => void;
  setTextLanguage: (lang: TextLanguage) => void;
  setAutoMarkPrevious: (enabled: boolean) => void;
  setHasSeenAutoMarkPrompt: (seen: boolean) => void;
  setStartDate: (path: StudyPath, date: string) => void;
  // Multi-path actions
  togglePath: (path: StudyPath) => void;
  setActivePaths: (paths: StudyPath[]) => void;
  setHideCompleted: (mode: HideCompletedMode) => void;

  // Day data actions
  setDayData: (path: StudyPath, date: string, data: DayData) => void;
  setDaysData: (path: StudyPath, daysData: Record<string, DayData>) => void;

  // Completion actions
  markComplete: (path: StudyPath, date: string, index: number) => void;
  markIncomplete: (path: StudyPath, date: string, index: number) => void;
  markAllComplete: (path: StudyPath, date: string, count: number) => void;
  resetDay: (path: StudyPath, date: string) => void;
  importDone: (done: CompletionMap) => void;

  // Reset actions
  resetPath: (path: StudyPath) => void;
  resetAll: () => void;

  // Migration
  setMigrated: () => void;

  // Bookmark actions
  addBookmark: (
    path: StudyPath,
    date: string,
    index: number,
    titleHe: string,
    titleEn: string | undefined,
    ref: string,
  ) => void;
  removeBookmark: (path: StudyPath, date: string, index: number) => void;
  updateBookmarkNote: (
    path: StudyPath,
    date: string,
    index: number,
    note: string,
  ) => void;
  getBookmark: (
    path: StudyPath,
    date: string,
    index: number,
  ) => Bookmark | undefined;

  // Summary actions
  saveSummary: (path: StudyPath, date: string, text: string) => void;
  getSummary: (path: StudyPath, date: string) => DaySummary | undefined;
  deleteSummary: (path: StudyPath, date: string) => void;

  // Helper to get current path's start date
  getCurrentStartDate: () => string;
  // Helper to get current path's days
  getCurrentDays: () => Record<string, DayData>;
}

/**
 * Create completion key from path, date, and index
 */
function makeKey(path: StudyPath, date: string, index: number): string {
  return `${path}:${date}:${index}`;
}

/**
 * Create bookmark key from path, date, and index
 */
function makeBookmarkKey(path: StudyPath, date: string, index: number): string {
  return `${path}:${date}:${index}`;
}

/**
 * Create summary key from path and date
 */
function makeSummaryKey(path: StudyPath, date: string): string {
  return `${path}:${date}`;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,
      days: {
        rambam3: {},
        rambam1: {},
        mitzvot: {},
      },
      done: {},
      bookmarks: {},
      summaries: {},
      hasMigratedLegacy: false,
      hasSeenAutoMarkPrompt: false,

      // Settings actions
      setStudyPath: (path) => set({ studyPath: path }),

      setTextLanguage: (lang) => set({ textLanguage: lang }),

      setAutoMarkPrevious: (enabled) => set({ autoMarkPrevious: enabled }),

      setHasSeenAutoMarkPrompt: (seen) => set({ hasSeenAutoMarkPrompt: seen }),

      setStartDate: (path, date) =>
        set((state) => ({
          startDates: {
            ...state.startDates,
            [path]: date,
          },
        })),

      // Toggle a path on/off in activePaths (min 1 required)
      togglePath: (path) =>
        set((state) => {
          const isActive = state.activePaths.includes(path);
          let newActivePaths: StudyPath[];

          if (isActive) {
            // Don't allow removing the last path
            if (state.activePaths.length <= 1) {
              return state;
            }
            newActivePaths = state.activePaths.filter((p) => p !== path);
          } else {
            newActivePaths = [...state.activePaths, path];
          }

          // Keep studyPath in sync with first active path
          return {
            activePaths: newActivePaths,
            studyPath: newActivePaths[0],
          };
        }),

      // Set multiple active paths at once (for onboarding)
      setActivePaths: (paths) =>
        set({
          activePaths: paths.length > 0 ? paths : ["rambam3"],
          studyPath: paths.length > 0 ? paths[0] : "rambam3",
        }),

      setHideCompleted: (mode) => set({ hideCompleted: mode }),

      // Day data actions
      setDayData: (path, date, data) =>
        set((state) => ({
          days: {
            ...state.days,
            [path]: {
              ...state.days[path],
              [date]: data,
            },
          },
        })),

      setDaysData: (path, daysData) =>
        set((state) => ({
          days: {
            ...state.days,
            [path]: {
              ...state.days[path],
              ...daysData,
            },
          },
        })),

      // Completion actions
      markComplete: (path, date, index) =>
        set((state) => ({
          done: {
            ...state.done,
            [makeKey(path, date, index)]: new Date().toISOString(),
          },
        })),

      markIncomplete: (path, date, index) =>
        set((state) => {
          const newDone = { ...state.done };
          delete newDone[makeKey(path, date, index)];
          return { done: newDone };
        }),

      markAllComplete: (path, date, count) =>
        set((state) => {
          const newDone = { ...state.done };
          const timestamp = new Date().toISOString();
          for (let i = 0; i < count; i++) {
            newDone[makeKey(path, date, i)] = timestamp;
          }
          return { done: newDone };
        }),

      resetDay: (path, date) =>
        set((state) => {
          const newDone = { ...state.done };
          const prefix = `${path}:${date}:`;
          Object.keys(newDone).forEach((key) => {
            if (key.startsWith(prefix)) {
              delete newDone[key];
            }
          });
          return { done: newDone };
        }),

      importDone: (importedDone) =>
        set((state) => ({
          done: { ...state.done, ...importedDone },
        })),

      // Reset actions
      resetPath: (path) =>
        set((state) => {
          // Remove all completion entries for this path
          const newDone = { ...state.done };
          const prefix = `${path}:`;
          Object.keys(newDone).forEach((key) => {
            if (key.startsWith(prefix)) {
              delete newDone[key];
            }
          });

          return {
            done: newDone,
            days: {
              ...state.days,
              [path]: {},
            },
            startDates: {
              ...state.startDates,
              [path]: CYCLE_46_START,
            },
          };
        }),

      resetAll: () =>
        set({
          ...DEFAULT_SETTINGS,
          days: {
            rambam3: {},
            rambam1: {},
            mitzvot: {},
          },
          done: {},
        }),

      // Migration
      setMigrated: () => set({ hasMigratedLegacy: true }),

      // Bookmark actions
      addBookmark: (path, date, index, titleHe, titleEn, ref) =>
        set((state) => {
          const key = makeBookmarkKey(path, date, index);
          const now = new Date().toISOString();
          const bookmark: Bookmark = {
            id: key,
            path,
            date,
            index,
            titleHe,
            titleEn,
            ref,
            createdAt: now,
            updatedAt: now,
          };
          return {
            bookmarks: {
              ...state.bookmarks,
              [key]: bookmark,
            },
          };
        }),

      removeBookmark: (path, date, index) =>
        set((state) => {
          const key = makeBookmarkKey(path, date, index);
          const newBookmarks = { ...state.bookmarks };
          delete newBookmarks[key];
          return { bookmarks: newBookmarks };
        }),

      updateBookmarkNote: (path, date, index, note) =>
        set((state) => {
          const key = makeBookmarkKey(path, date, index);
          const existing = state.bookmarks[key];
          if (!existing) return state;
          return {
            bookmarks: {
              ...state.bookmarks,
              [key]: {
                ...existing,
                note,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      getBookmark: (path, date, index) => {
        const key = makeBookmarkKey(path, date, index);
        return get().bookmarks[key];
      },

      // Summary actions
      saveSummary: (path, date, text) =>
        set((state) => {
          const key = makeSummaryKey(path, date);
          const now = new Date().toISOString();
          const existing = state.summaries[key];
          const summary: DaySummary = {
            id: key,
            path,
            date,
            text,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          };
          return {
            summaries: {
              ...state.summaries,
              [key]: summary,
            },
          };
        }),

      getSummary: (path, date) => {
        const key = makeSummaryKey(path, date);
        return get().summaries[key];
      },

      deleteSummary: (path, date) =>
        set((state) => {
          const key = makeSummaryKey(path, date);
          const newSummaries = { ...state.summaries };
          delete newSummaries[key];
          return { summaries: newSummaries };
        }),

      // Helpers
      getCurrentStartDate: () => {
        const state = get();
        return state.startDates[state.studyPath];
      },

      getCurrentDays: () => {
        const state = get();
        return state.days[state.studyPath];
      },
    }),
    {
      name: "rambam-app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Strip texts and chapterBreaks from days (they're now in IndexedDB)
        const cleanedDays: typeof state.days = {
          rambam3: {},
          rambam1: {},
          mitzvot: {},
        };

        for (const path of Object.keys(state.days) as Array<
          keyof typeof state.days
        >) {
          const pathDays = state.days[path] || {};
          for (const [date, dayData] of Object.entries(pathDays)) {
            if (dayData) {
              cleanedDays[path][date] = {
                he: dayData.he || "",
                en: dayData.en,
                ref: dayData.ref || "",
                count: dayData.count || 0,
                heDate: dayData.heDate,
                enDate: dayData.enDate,
                // texts and chapterBreaks are intentionally excluded
              };
            }
          }
        }

        return {
          // Only persist these fields
          studyPath: state.studyPath,
          activePaths: state.activePaths,
          textLanguage: state.textLanguage,
          autoMarkPrevious: state.autoMarkPrevious,
          hideCompleted: state.hideCompleted,
          hasSeenAutoMarkPrompt: state.hasSeenAutoMarkPrompt,
          startDates: state.startDates,
          days: cleanedDays,
          done: state.done,
          bookmarks: state.bookmarks,
          summaries: state.summaries,
          hasMigratedLegacy: state.hasMigratedLegacy,
        };
      },
      // Merge handler for migration from old state format
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppStore>;

        // Migrate: if no activePaths, initialize from studyPath
        const activePaths =
          persisted.activePaths && persisted.activePaths.length > 0
            ? persisted.activePaths
            : [persisted.studyPath || currentState.studyPath];

        // Migrate: if no hideCompleted, default to 'after24h'
        const hideCompleted = persisted.hideCompleted || "after24h";

        // Migrate: if no bookmarks/summaries, initialize empty
        const bookmarks = persisted.bookmarks || {};
        const summaries = persisted.summaries || {};

        return {
          ...currentState,
          ...persisted,
          activePaths,
          hideCompleted,
          bookmarks,
          summaries,
        };
      },
    },
  ),
);

/**
 * Helper function to count completed halakhot for a day
 */
export function countCompleted(
  done: CompletionMap,
  path: StudyPath,
  date: string,
): number {
  const prefix = `${path}:${date}:`;
  return Object.keys(done).filter((key) => key.startsWith(prefix)).length;
}

/**
 * Helper function to check if a specific halakha is done
 */
export function isHalakhaDone(
  done: CompletionMap,
  path: StudyPath,
  date: string,
  index: number,
): boolean {
  return makeKey(path, date, index) in done;
}

/**
 * Helper function to check if a day is fully completed
 */
export function isDayComplete(
  done: CompletionMap,
  path: StudyPath,
  date: string,
  count: number,
): boolean {
  return countCompleted(done, path, date) >= count;
}

/**
 * Helper function to check if a halakha is bookmarked
 */
export function isHalakhaBookmarked(
  bookmarks: BookmarksMap,
  path: StudyPath,
  date: string,
  index: number,
): boolean {
  const key = `${path}:${date}:${index}`;
  return key in bookmarks;
}

/**
 * Helper function to get all bookmarks as array, sorted by most recent
 */
export function getBookmarksArray(bookmarks: BookmarksMap): Bookmark[] {
  return Object.values(bookmarks).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Helper function to count total bookmarks
 */
export function countBookmarks(bookmarks: BookmarksMap): number {
  return Object.keys(bookmarks).length;
}
