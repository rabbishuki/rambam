/**
 * IndexedDB storage service for offline-first data
 * Uses idb library for Promise-based IndexedDB access
 */

import { openDB, type IDBPDatabase } from "idb";
import type { HalakhaText, StudyPath } from "@/types";

const DB_NAME = "rambam-offline";
const DB_VERSION = 1;

// Store names
const TEXTS_STORE = "texts";
const CALENDAR_STORE = "calendar";
const META_STORE = "meta";

// Types for stored data
export interface StoredText {
  ref: string;
  halakhot: HalakhaText[];
  chapterBreaks: number[];
  fetchedAt: string; // ISO timestamp
  languagesLoaded?: { he: boolean; en: boolean }; // Which languages were fetched
}

export interface StoredCalendar {
  key: string; // "path:date"
  path: StudyPath;
  date: string;
  he: string;
  en?: string;
  ref: string;
  count: number;
  heDate?: string;
  enDate?: string;
  fetchedAt: string; // ISO timestamp
}

export interface StoredMeta {
  key: string;
  value: unknown;
}

// Database instance (singleton)
let dbInstance: IDBPDatabase | null = null;

/**
 * Open or get the existing database connection
 */
export async function openDatabase(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Texts store - keyed by ref
      if (!db.objectStoreNames.contains(TEXTS_STORE)) {
        db.createObjectStore(TEXTS_STORE, { keyPath: "ref" });
      }

      // Calendar store - keyed by "path:date"
      if (!db.objectStoreNames.contains(CALENDAR_STORE)) {
        const calendarStore = db.createObjectStore(CALENDAR_STORE, {
          keyPath: "key",
        });
        calendarStore.createIndex("by-path-date", ["path", "date"]);
      }

      // Meta store - for app metadata
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    },
  });

  return dbInstance;
}

/**
 * Check if a timestamp is stale (older than threshold)
 */
export function isStale(fetchedAt: string, thresholdDays = 7): boolean {
  const threshold = thresholdDays * 24 * 60 * 60 * 1000;
  const age = Date.now() - new Date(fetchedAt).getTime();
  return age > threshold;
}

// ─────────────────────────────────────────────────────────────
// Text operations
// ─────────────────────────────────────────────────────────────

/**
 * Get text from IndexedDB by ref
 */
export async function getTextFromDB(
  ref: string,
): Promise<StoredText | undefined> {
  const db = await openDatabase();
  return db.get(TEXTS_STORE, ref);
}

/**
 * Save text to IndexedDB
 */
export async function saveTextToDB(
  ref: string,
  halakhot: HalakhaText[],
  chapterBreaks: number[],
  languagesLoaded?: { he: boolean; en: boolean },
): Promise<void> {
  const db = await openDatabase();
  const stored: StoredText = {
    ref,
    halakhot,
    chapterBreaks,
    fetchedAt: new Date().toISOString(),
    languagesLoaded,
  };
  await db.put(TEXTS_STORE, stored);
}

/**
 * Get multiple texts from IndexedDB (batch read)
 */
export async function getMultipleTexts(
  refs: string[],
): Promise<Map<string, StoredText>> {
  const db = await openDatabase();
  const results = new Map<string, StoredText>();

  // Use a transaction for batch efficiency
  const tx = db.transaction(TEXTS_STORE, "readonly");
  const store = tx.objectStore(TEXTS_STORE);

  await Promise.all(
    refs.map(async (ref) => {
      const text = await store.get(ref);
      if (text) {
        results.set(ref, text);
      }
    }),
  );

  await tx.done;
  return results;
}

// ─────────────────────────────────────────────────────────────
// Calendar operations
// ─────────────────────────────────────────────────────────────

/**
 * Create calendar key from path and date
 */
function makeCalendarKey(path: StudyPath, date: string): string {
  return `${path}:${date}`;
}

/**
 * Get calendar entry from IndexedDB
 */
export async function getCalendarFromDB(
  path: StudyPath,
  date: string,
): Promise<StoredCalendar | undefined> {
  const db = await openDatabase();
  const key = makeCalendarKey(path, date);
  return db.get(CALENDAR_STORE, key);
}

/**
 * Save calendar entry to IndexedDB
 */
export async function saveCalendarToDB(
  path: StudyPath,
  date: string,
  data: {
    he: string;
    en?: string;
    ref: string;
    count: number;
    heDate?: string;
    enDate?: string;
  },
): Promise<void> {
  const db = await openDatabase();
  const stored: StoredCalendar = {
    key: makeCalendarKey(path, date),
    path,
    date,
    ...data,
    fetchedAt: new Date().toISOString(),
  };
  await db.put(CALENDAR_STORE, stored);
}

/**
 * Update Hebrew date fields on an existing calendar entry
 */
export async function updateCalendarHebrewDate(
  path: StudyPath,
  date: string,
  heDate: string,
  enDate: string,
): Promise<void> {
  const db = await openDatabase();
  const key = makeCalendarKey(path, date);
  const existing = await db.get(CALENDAR_STORE, key);

  if (existing) {
    const updated: StoredCalendar = {
      ...existing,
      heDate,
      enDate,
    };
    await db.put(CALENDAR_STORE, updated);
  }
}

/**
 * Get multiple calendar entries for a date range
 */
export async function getCalendarRange(
  path: StudyPath,
  dates: string[],
): Promise<Map<string, StoredCalendar>> {
  const db = await openDatabase();
  const results = new Map<string, StoredCalendar>();

  const tx = db.transaction(CALENDAR_STORE, "readonly");
  const store = tx.objectStore(CALENDAR_STORE);

  await Promise.all(
    dates.map(async (date) => {
      const key = makeCalendarKey(path, date);
      const entry = await store.get(key);
      if (entry) {
        results.set(date, entry);
      }
    }),
  );

  await tx.done;
  return results;
}

// ─────────────────────────────────────────────────────────────
// Meta operations
// ─────────────────────────────────────────────────────────────

/**
 * Get meta value
 */
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  const entry = await db.get(META_STORE, key);
  return entry?.value as T | undefined;
}

/**
 * Set meta value
 */
export async function setMeta<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  await db.put(META_STORE, { key, value });
}

// ─────────────────────────────────────────────────────────────
// Maintenance operations
// ─────────────────────────────────────────────────────────────

/**
 * Clear stale data from the database
 * @param maxAgeDays - Maximum age in days before data is considered stale
 * @returns Number of entries cleared
 */
export async function clearStaleData(maxAgeDays = 30): Promise<number> {
  const db = await openDatabase();
  const threshold = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let cleared = 0;

  // Clear stale texts
  const textsTx = db.transaction(TEXTS_STORE, "readwrite");
  const textsStore = textsTx.objectStore(TEXTS_STORE);
  let textsCursor = await textsStore.openCursor();

  while (textsCursor) {
    const entry = textsCursor.value as StoredText;
    if (new Date(entry.fetchedAt).getTime() < threshold) {
      await textsCursor.delete();
      cleared++;
    }
    textsCursor = await textsCursor.continue();
  }
  await textsTx.done;

  // Clear stale calendar entries
  const calendarTx = db.transaction(CALENDAR_STORE, "readwrite");
  const calendarStore = calendarTx.objectStore(CALENDAR_STORE);
  let calendarCursor = await calendarStore.openCursor();

  while (calendarCursor) {
    const entry = calendarCursor.value as StoredCalendar;
    if (new Date(entry.fetchedAt).getTime() < threshold) {
      await calendarCursor.delete();
      cleared++;
    }
    calendarCursor = await calendarCursor.continue();
  }
  await calendarTx.done;

  return cleared;
}

/**
 * Clean up old text cache from IndexedDB.
 * Removes calendar and text entries for old days that are fully completed,
 * have no bookmarks, and are not pinned for offline access.
 * User data (completion records, day metadata) is NEVER deleted — only cached text.
 */
export async function cleanupCompletedDays(
  done: Record<string, string>,
  bookmarks: Record<string, unknown>,
  activePaths: StudyPath[],
  retentionDays: number,
  pinnedDays?: Record<string, boolean>,
): Promise<number> {
  const db = await openDatabase();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - retentionDays);
  const thresholdStr = threshold.toISOString().slice(0, 10);
  let cleaned = 0;

  const calendarTx = db.transaction([CALENDAR_STORE, TEXTS_STORE], "readwrite");
  const calendarStore = calendarTx.objectStore(CALENDAR_STORE);
  const textsStore = calendarTx.objectStore(TEXTS_STORE);

  let cursor = await calendarStore.openCursor();
  while (cursor) {
    const entry = cursor.value as StoredCalendar;

    // Only process active paths and old dates
    if (activePaths.includes(entry.path) && entry.date < thresholdStr) {
      const prefix = `${entry.path}:${entry.date}:`;
      const pinKey = `${entry.path}:${entry.date}`;

      // Skip pinned days
      if (pinnedDays?.[pinKey]) {
        cursor = await cursor.continue();
        continue;
      }

      // Check if fully completed
      const doneKeys = Object.keys(done).filter((k) => k.startsWith(prefix));
      const isComplete = doneKeys.length >= entry.count;

      // Check for bookmarks
      const hasBookmarks = Object.keys(bookmarks).some((k) =>
        k.startsWith(prefix),
      );

      if (isComplete && !hasBookmarks) {
        // Delete calendar entry
        await cursor.delete();

        // Delete associated text
        try {
          await textsStore.delete(entry.ref);
        } catch {
          // Text may not exist or be shared, ignore
        }

        cleaned++;
      }
    }

    cursor = await cursor.continue();
  }

  await calendarTx.done;
  return cleaned;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  textsCount: number;
  calendarCount: number;
}> {
  const db = await openDatabase();
  const textsCount = await db.count(TEXTS_STORE);
  const calendarCount = await db.count(CALENDAR_STORE);
  return { textsCount, calendarCount };
}

/**
 * Clear all cached text and calendar data from IndexedDB.
 * User data (completion records, bookmarks, settings) is not affected.
 */
export async function clearTextCache(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([TEXTS_STORE, CALENDAR_STORE], "readwrite");
  await tx.objectStore(TEXTS_STORE).clear();
  await tx.objectStore(CALENDAR_STORE).clear();
  await tx.done;
}

/**
 * Close the database connection (useful for testing)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
