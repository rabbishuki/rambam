/**
 * Data export/import service
 * Allows users to transfer their study progress between devices
 */

import { useAppStore } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import type {
  StudyPath,
  TextLanguage,
  HideCompletedMode,
  ThemeId,
  CardStyle,
  ContentWidth,
  CompletionMap,
  BookmarksMap,
  SummariesMap,
} from "@/types";

/**
 * Export data format (versioned for future compatibility)
 * v3 adds settings block with all user preferences
 */
export interface ExportData {
  version: 2 | 3;
  exportedAt: string;
  app: {
    studyPath: StudyPath;
    textLanguage: TextLanguage;
    autoMarkPrevious: boolean;
    hasSeenAutoMarkPrompt: boolean;
    startDates: Record<StudyPath, string>;
    done: CompletionMap;
    bookmarks?: BookmarksMap;
    summaries?: SummariesMap;
  };
  settings?: {
    theme: ThemeId;
    cardStyle: CardStyle;
    contentWidth: ContentWidth;
    activePaths: StudyPath[];
    hideCompleted: HideCompletedMode;
    daysAhead: number;
    textRetentionDays: number;
  };
  location?: {
    coords: { latitude: number; longitude: number };
    cityName: { he: string; en: string };
    isManual: boolean;
  };
}

/**
 * Gather all exportable data from stores
 */
export function exportData(): ExportData {
  const appState = useAppStore.getState();
  const locationState = useLocationStore.getState();

  const data: ExportData = {
    version: 3,
    exportedAt: new Date().toISOString(),
    app: {
      studyPath: appState.studyPath,
      textLanguage: appState.textLanguage,
      autoMarkPrevious: appState.autoMarkPrevious,
      hasSeenAutoMarkPrompt: appState.hasSeenAutoMarkPrompt,
      startDates: appState.startDates,
      done: appState.done,
      bookmarks: appState.bookmarks,
      summaries: appState.summaries,
    },
    settings: {
      theme: appState.theme,
      cardStyle: appState.cardStyle,
      contentWidth: appState.contentWidth,
      activePaths: appState.activePaths,
      hideCompleted: appState.hideCompleted,
      daysAhead: appState.daysAhead,
      textRetentionDays: appState.textRetentionDays,
    },
  };

  // Only include location if user has set it up
  if (locationState.hasCompletedSetup && !locationState.isDefault) {
    data.location = {
      coords: locationState.coords,
      cityName: locationState.cityName,
      isManual: locationState.isManual,
    };
  }

  return data;
}

/**
 * Create and download a JSON backup file
 */
export function downloadExport(): void {
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  // Generate filename with date
  const date = new Date().toISOString().split("T")[0];
  const filename = `rambam-backup-${date}.json`;

  // Create download link and trigger it
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Type guard to validate imported data structure
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check version (support v1, v2, and v3)
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) {
    return false;
  }

  // Check app object exists
  if (!obj.app || typeof obj.app !== "object") {
    return false;
  }

  const app = obj.app as Record<string, unknown>;

  // Check required app fields
  if (
    typeof app.studyPath !== "string" ||
    !["rambam3", "rambam1", "mitzvot"].includes(app.studyPath)
  ) {
    return false;
  }

  if (
    typeof app.textLanguage !== "string" ||
    !["hebrew", "english", "both"].includes(app.textLanguage)
  ) {
    return false;
  }

  if (typeof app.autoMarkPrevious !== "boolean") {
    return false;
  }

  if (typeof app.hasSeenAutoMarkPrompt !== "boolean") {
    return false;
  }

  if (!app.startDates || typeof app.startDates !== "object") {
    return false;
  }

  if (!app.done || typeof app.done !== "object") {
    return false;
  }

  // Validate done map entries (should be string keys and string timestamps)
  for (const [key, value] of Object.entries(
    app.done as Record<string, unknown>,
  )) {
    if (typeof key !== "string" || typeof value !== "string") {
      return false;
    }
  }

  // Settings is optional (v3), no strict validation needed
  // Location is optional, but if present must be valid
  if (obj.location !== undefined) {
    if (typeof obj.location !== "object" || obj.location === null) {
      return false;
    }

    const loc = obj.location as Record<string, unknown>;

    if (!loc.coords || typeof loc.coords !== "object") {
      return false;
    }

    const coords = loc.coords as Record<string, unknown>;
    if (
      typeof coords.latitude !== "number" ||
      typeof coords.longitude !== "number"
    ) {
      return false;
    }

    if (!loc.cityName || typeof loc.cityName !== "object") {
      return false;
    }

    const cityName = loc.cityName as Record<string, unknown>;
    if (typeof cityName.he !== "string" || typeof cityName.en !== "string") {
      return false;
    }

    if (typeof loc.isManual !== "boolean") {
      return false;
    }
  }

  return true;
}

/**
 * Apply imported data to stores
 * Merges completion data with existing (imported entries take precedence)
 */
export function importData(data: ExportData): void {
  const appStore = useAppStore.getState();
  const locationStore = useLocationStore.getState();

  // Apply app settings
  appStore.setStudyPath(data.app.studyPath);
  appStore.setTextLanguage(data.app.textLanguage);
  appStore.setAutoMarkPrevious(data.app.autoMarkPrevious);
  appStore.setHasSeenAutoMarkPrompt(data.app.hasSeenAutoMarkPrompt);

  // Apply start dates for each path
  for (const path of ["rambam3", "rambam1", "mitzvot"] as StudyPath[]) {
    if (data.app.startDates[path]) {
      appStore.setStartDate(path, data.app.startDates[path]);
    }
  }

  // Merge completion data (imported takes precedence)
  appStore.importDone(data.app.done);

  // Import bookmarks if present (v2+ format)
  if (data.app.bookmarks) {
    for (const bookmark of Object.values(data.app.bookmarks)) {
      appStore.addBookmark(
        bookmark.path,
        bookmark.date,
        bookmark.index,
        bookmark.titleHe,
        bookmark.titleEn,
        bookmark.ref,
        bookmark.textHe,
        bookmark.textEn,
      );
      if (bookmark.note) {
        appStore.updateBookmarkNote(
          bookmark.path,
          bookmark.date,
          bookmark.index,
          bookmark.note,
        );
      }
    }
  }

  // Import summaries if present (v2+ format)
  if (data.app.summaries) {
    for (const summary of Object.values(data.app.summaries)) {
      appStore.saveSummary(summary.path, summary.date, summary.text);
    }
  }

  // Apply settings if present (v3 format)
  if (data.settings) {
    if (data.settings.theme) appStore.setTheme(data.settings.theme);
    if (data.settings.cardStyle) appStore.setCardStyle(data.settings.cardStyle);
    if (data.settings.contentWidth)
      appStore.setContentWidth(data.settings.contentWidth);
    if (data.settings.activePaths?.length)
      appStore.setActivePaths(data.settings.activePaths);
    if (data.settings.hideCompleted)
      appStore.setHideCompleted(data.settings.hideCompleted);
    if (data.settings.daysAhead) appStore.setDaysAhead(data.settings.daysAhead);
    if (data.settings.textRetentionDays !== undefined)
      appStore.setTextRetentionDays(data.settings.textRetentionDays);
  }

  // Apply location if present
  if (data.location) {
    locationStore.setLocation(
      data.location.coords,
      data.location.cityName,
      data.location.isManual,
      false, // Not default since user explicitly set it
    );
    locationStore.markLocationSetup();
  }
}

/**
 * Parse and validate a File object as import data
 */
export async function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!validateImportData(data)) {
          reject(new Error("Invalid backup file format"));
          return;
        }

        resolve(data);
      } catch {
        reject(new Error("Failed to parse backup file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
