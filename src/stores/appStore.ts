/**
 * Main application store using Zustand
 * Manages settings, day data, and completion tracking
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  StudyPath,
  TextLanguage,
  DayData,
  CompletionMap,
  AppSettings,
} from "@/types";
import { DEFAULT_SETTINGS, CYCLE_46_START } from "@/types";

interface AppStore extends AppSettings {
  // Per-path day data
  days: Record<StudyPath, Record<string, DayData>>;
  // Completion tracking: "path:date:index" → ISO timestamp
  done: CompletionMap;
  // Migration flag
  hasMigratedLegacy: boolean;

  // Settings actions
  setStudyPath: (path: StudyPath) => void;
  setTextLanguage: (lang: TextLanguage) => void;
  setAutoMarkPrevious: (enabled: boolean) => void;
  setStartDate: (path: StudyPath, date: string) => void;

  // Day data actions
  setDayData: (path: StudyPath, date: string, data: DayData) => void;
  setDaysData: (path: StudyPath, daysData: Record<string, DayData>) => void;

  // Completion actions
  markComplete: (path: StudyPath, date: string, index: number) => void;
  markIncomplete: (path: StudyPath, date: string, index: number) => void;
  markAllComplete: (path: StudyPath, date: string, count: number) => void;
  resetDay: (path: StudyPath, date: string) => void;

  // Reset actions
  resetPath: (path: StudyPath) => void;
  resetAll: () => void;

  // Migration
  setMigrated: () => void;

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
      hasMigratedLegacy: false,

      // Settings actions
      setStudyPath: (path) => set({ studyPath: path }),

      setTextLanguage: (lang) => set({ textLanguage: lang }),

      setAutoMarkPrevious: (enabled) => set({ autoMarkPrevious: enabled }),

      setStartDate: (path, date) =>
        set((state) => ({
          startDates: {
            ...state.startDates,
            [path]: date,
          },
        })),

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
      partialize: (state) => ({
        // Only persist these fields
        studyPath: state.studyPath,
        textLanguage: state.textLanguage,
        autoMarkPrevious: state.autoMarkPrevious,
        startDates: state.startDates,
        days: state.days,
        done: state.done,
        hasMigratedLegacy: state.hasMigratedLegacy,
      }),
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
