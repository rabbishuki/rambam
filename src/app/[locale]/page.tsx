"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore, isDayComplete, hasDayBookmarks } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import { useJewishDate } from "@/hooks/useJewishDate";
import { Header } from "@/components/layout/Header";
import { StatsBar } from "@/components/layout/StatsBar";
import { DayGroup } from "@/components/halakha/DayGroup";
import {
  InstallPrompt,
  useInstallPrompt,
} from "@/components/pwa/InstallPrompt";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { ScrollToIncompleteFAB } from "@/components/ui/ScrollToIncompleteFAB";
import dynamic from "next/dynamic";
import { fetchCalendar, fetchHalakhot } from "@/services/sefaria";
import { useTutorial } from "@/hooks/useTutorial";
import { useShallow } from "zustand/react/shallow";

// Dynamic imports for modal components (only loaded when opened)
const SettingsPanel = dynamic(
  () =>
    import("@/components/settings/SettingsPanel").then(
      (mod) => mod.SettingsPanel,
    ),
  { ssr: false },
);
const Calendar = dynamic(
  () => import("@/components/calendar").then((mod) => mod.Calendar),
  { ssr: false },
);
const SummariesList = dynamic(
  () => import("@/components/summaries").then((mod) => mod.SummariesList),
  { ssr: false },
);
const LocationSetupDialog = dynamic(
  () =>
    import("@/components/location/LocationSetupDialog").then(
      (mod) => mod.LocationSetupDialog,
    ),
  { ssr: false },
);

// Dynamic import to avoid SSR hydration issues
const Tutorial = dynamic(
  () => import("@/components/tutorial").then((mod) => mod.Tutorial),
  { ssr: false },
);
import { dateRange } from "@/lib/dates";
import { useTheme } from "@/hooks/useTheme";
import type { DayData, StudyPath, ContentWidth } from "@/types";

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations();
  const isHebrew = locale === "he";

  // Apply theme CSS variables to document root
  useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [revealLimit, setRevealLimit] = useState(20);
  const [hiddenFilter, setHiddenFilter] = useState<
    "all" | "bookmarked" | "hasNote" | "noNote"
  >("all");

  // Batched settings selectors (useShallow for shallow comparison)
  const {
    studyPath,
    activePaths,
    textLanguage,
    autoMarkPrevious,
    hideCompleted,
    startDates,
    hasMigratedLegacy,
  } = useAppStore(
    useShallow((s) => ({
      studyPath: s.studyPath,
      activePaths: s.activePaths,
      textLanguage: s.textLanguage,
      autoMarkPrevious: s.autoMarkPrevious,
      hideCompleted: s.hideCompleted,
      startDates: s.startDates,
      hasMigratedLegacy: s.hasMigratedLegacy,
    })),
  );

  // Batched data selectors
  const { days, done, summaries, bookmarks } = useAppStore(
    useShallow((s) => ({
      days: s.days,
      done: s.done,
      summaries: s.summaries,
      bookmarks: s.bookmarks,
    })),
  );

  // Actions: extract via getState() since they're stable refs used in effects/handlers
  const {
    setDaysData,
    setDayData,
    setMigrated,
    setStartDate,
    markComplete: markCompleteFn,
  } = useMemo(
    () => ({
      setDaysData: useAppStore.getState().setDaysData,
      setDayData: useAppStore.getState().setDayData,
      setMigrated: useAppStore.getState().setMigrated,
      setStartDate: useAppStore.getState().setStartDate,
      markComplete: useAppStore.getState().markComplete,
    }),
    [],
  );

  // Location store
  const hasCompletedSetup = useLocationStore(
    (state) => state.hasCompletedSetup,
  );
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Install prompt
  const { canInstall, install } = useInstallPrompt();

  // Offline status
  const { isOffline } = useOfflineStatus();

  // Jewish date
  const today = useJewishDate();

  const contentWidth = useAppStore((s) => s.contentWidth) as ContentWidth;

  // Tutorial state - used to hide UI elements during tutorial
  const { isActive: isTutorialActive, currentStage } = useTutorial();
  const isJumpButtonStage = currentStage?.id === "jump-button";
  const isSettingsStage = currentStage?.id === "settings";

  // Background preload modal chunks after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      import("@/components/settings/SettingsPanel");
      import("@/components/calendar");
      import("@/components/summaries");
      import("@/components/location/LocationSetupDialog");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Get earliest start date across all active paths
  const startDate = useMemo(() => {
    // Guard against undefined during hydration
    if (!activePaths || activePaths.length === 0) {
      return startDates?.rambam3 ?? "2026-02-03";
    }
    return activePaths.reduce((earliest, path) => {
      const pathStart = startDates[path];
      return pathStart < earliest ? pathStart : earliest;
    }, startDates[activePaths[0]]);
  }, [activePaths, startDates]);

  // Primary path's days (for backward compat with some existing logic)
  const pathDays = days[studyPath];

  // Helper to check if a day should be hidden based on completion
  const shouldHideDay = useCallback(
    (date: string, path: StudyPath): boolean => {
      if (hideCompleted === "show") return false;

      const dayData = days[path][date];
      if (!dayData) return false;
      if (!isDayComplete(done, path, date, dayData.count)) return false;

      if (hideCompleted === "immediate") return true;

      // Check completion timestamp for time-based hiding
      // Find the last completed item's timestamp
      const lastCompletionKey = `${path}:${date}:${dayData.count - 1}`;
      const completedAt = done[lastCompletionKey];
      if (!completedAt) return false;

      const hoursAgo = (Date.now() - new Date(completedAt).getTime()) / 3600000;
      if (hideCompleted === "after1h") return hoursAgo >= 1;
      if (hideCompleted === "after24h") return hoursAgo >= 24;
      return false;
    },
    [hideCompleted, days, done],
  );

  // Migrate legacy localStorage data
  useEffect(() => {
    if (hasMigratedLegacy) return;

    const legacyStart = localStorage.getItem("rambam_start");
    const legacyDays = localStorage.getItem("rambam_days");
    const legacyDone = localStorage.getItem("rambam_done");
    const legacyChapters = localStorage.getItem("rambam_chapters");
    const legacyAutoMark = localStorage.getItem("rambam_auto_mark");

    if (legacyStart || legacyDays || legacyDone) {
      console.log("Migrating legacy data...");

      // Determine which path legacy data belongs to
      const legacyPath: StudyPath =
        legacyChapters === "1" ? "rambam1" : "rambam3";

      // Migrate start date
      if (legacyStart) {
        setStartDate(legacyPath, legacyStart);
      }

      // Migrate days data
      if (legacyDays) {
        try {
          const parsedDays = JSON.parse(legacyDays) as Record<string, DayData>;
          setDaysData(legacyPath, parsedDays);
        } catch (e) {
          console.error("Failed to parse legacy days:", e);
        }
      }

      // Migrate completion data
      if (legacyDone) {
        try {
          const parsedDone = JSON.parse(legacyDone) as Record<string, string>;
          Object.keys(parsedDone).forEach((key) => {
            // Old format: "date:index" -> new format: "path:date:index"
            const parts = key.split(":");
            if (parts.length === 2) {
              const [date, indexStr] = parts;
              const index = parseInt(indexStr);
              markCompleteFn(legacyPath, date, index);
            }
          });
        } catch (e) {
          console.error("Failed to parse legacy done:", e);
        }
      }

      // Migrate auto-mark setting
      if (legacyAutoMark !== null) {
        useAppStore.getState().setAutoMarkPrevious(legacyAutoMark === "true");
      }

      // Set study path to migrated path
      useAppStore.getState().setStudyPath(legacyPath);

      // Clear legacy keys
      localStorage.removeItem("rambam_start");
      localStorage.removeItem("rambam_days");
      localStorage.removeItem("rambam_done");
      localStorage.removeItem("rambam_chapters");
      localStorage.removeItem("rambam_auto_mark");

      console.log("Migration complete");
    }

    setMigrated();
  }, [
    hasMigratedLegacy,
    setMigrated,
    setStartDate,
    setDaysData,
    markCompleteFn,
  ]);

  // Wait for Zustand stores to hydrate from localStorage before checking setup state
  useEffect(() => {
    // Check if location store has hydrated
    const unsubscribe = useLocationStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    // If already hydrated (e.g., hot reload), set immediately
    if (useLocationStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return unsubscribe;
  }, []);

  // Show location dialog on first visit (if location not set up)
  // Only check after store has hydrated from localStorage
  useEffect(() => {
    if (hasHydrated && !hasCompletedSetup) {
      setShowLocationDialog(true);
    }
  }, [hasHydrated, hasCompletedSetup]);

  // Reset showHidden when hideCompleted setting changes or when navigating to a specific date
  useEffect(() => {
    setShowHidden(false);
    setRevealLimit(20);
    setHiddenFilter("all");
  }, [hideCompleted, viewingDate]);

  // Load missing days data for all active paths (only after location is set up)
  useEffect(() => {
    // Don't load data until location is set up
    if (!hasCompletedSetup) {
      setIsLoading(false);
      return;
    }

    async function loadMissingDays() {
      setIsLoading(true);

      try {
        const allDates = dateRange(startDate, today);

        // Load all paths in parallel instead of sequentially
        await Promise.allSettled(
          activePaths.map(async (path) => {
            const pathData = days[path];
            const pathStartDate = startDates[path];
            const missingDates = allDates.filter(
              (date) => date >= pathStartDate && !pathData[date],
            );

            if (missingDates.length === 0) return;

            // Fetch all missing dates in parallel for this path
            const results = await Promise.allSettled(
              missingDates.map(async (date) => {
                const calData = await fetchCalendar(date, path);
                const { halakhot, chapterBreaks } = await fetchHalakhot(
                  calData.ref,
                );

                return {
                  date,
                  data: {
                    he: calData.he,
                    en: calData.en,
                    ref: calData.ref,
                    refs: "refs" in calData ? calData.refs : undefined,
                    count: halakhot.length,
                    heDate: calData.heDate,
                    enDate: calData.enDate,
                    texts: halakhot,
                    chapterBreaks,
                  } as DayData,
                };
              }),
            );

            // Process results
            const newDays: Record<string, DayData> = {};
            results.forEach((result, index) => {
              if (result.status === "fulfilled") {
                newDays[result.value.date] = result.value.data;
              } else {
                console.error(
                  `Failed to load ${path}/${missingDates[index]}:`,
                  result.reason,
                );
              }
            });

            if (Object.keys(newDays).length > 0) {
              setDaysData(path, newDays);
            }
          }),
        );
      } catch (error) {
        console.error("Failed to load days:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMissingDays();
  }, [
    startDate,
    today,
    activePaths,
    days,
    startDates,
    setDaysData,
    hasCompletedSetup,
  ]);

  // Get all unique dates across all active paths, sorted newest first
  const sortedDates = useMemo(() => {
    if (!activePaths || activePaths.length === 0) return [];
    const allDates = new Set<string>();
    activePaths.forEach((path) => {
      const pathStart = startDates[path];
      Object.keys(days[path] ?? {})
        .filter((date) => date <= today && date >= pathStart)
        .forEach((date) => allDates.add(date));
    });
    return Array.from(allDates).sort((a, b) => b.localeCompare(a));
  }, [activePaths, days, startDates, today]);

  // Build display data split into active (non-hidden) and hidden items
  type DisplayItem = { date: string; path: StudyPath; dayData: DayData };
  const {
    activeData,
    hiddenCount,
    filteredHiddenCount,
    revealedData,
    filterCounts,
  } = useMemo(() => {
    if (!activePaths || activePaths.length === 0)
      return {
        activeData: [] as DisplayItem[],
        hiddenCount: 0,
        filteredHiddenCount: 0,
        revealedData: [] as DisplayItem[],
        filterCounts: { all: 0, bookmarked: 0, hasNote: 0, noNote: 0 },
      };
    const dates = viewingDate ? [viewingDate] : sortedDates;
    const active: DisplayItem[] = [];
    const allHidden: DisplayItem[] = [];

    dates.forEach((date) => {
      activePaths.forEach((path) => {
        const dayData = days[path]?.[date];
        if (dayData) {
          if (shouldHideDay(date, path)) {
            allHidden.push({ date, path, dayData });
          } else {
            active.push({ date, path, dayData });
          }
        }
      });
    });

    // Apply filter
    const filtered =
      hiddenFilter === "all"
        ? allHidden
        : allHidden.filter((item) => {
            if (hiddenFilter === "bookmarked")
              return hasDayBookmarks(bookmarks, item.path, item.date);
            if (hiddenFilter === "hasNote")
              return !!summaries[`${item.path}:${item.date}`];
            if (hiddenFilter === "noNote")
              return !summaries[`${item.path}:${item.date}`];
            return true;
          });

    // Paginate
    const revealed = showHidden ? filtered.slice(0, revealLimit) : [];

    // Compute filter counts only when toolbar is expanded
    const counts = showHidden
      ? {
          all: allHidden.length,
          bookmarked: allHidden.filter((i) =>
            hasDayBookmarks(bookmarks, i.path, i.date),
          ).length,
          hasNote: allHidden.filter((i) => !!summaries[`${i.path}:${i.date}`])
            .length,
          noNote: allHidden.filter((i) => !summaries[`${i.path}:${i.date}`])
            .length,
        }
      : { all: allHidden.length, bookmarked: 0, hasNote: 0, noNote: 0 };

    return {
      activeData: active,
      hiddenCount: allHidden.length,
      filteredHiddenCount: filtered.length,
      revealedData: revealed,
      filterCounts: counts,
    };
  }, [
    viewingDate,
    sortedDates,
    activePaths,
    days,
    shouldHideDay,
    showHidden,
    revealLimit,
    hiddenFilter,
    bookmarks,
    summaries,
  ]);

  // Handle calendar button click — always opens the calendar
  const handleCalendarClick = useCallback(() => {
    // Block calendar during entire tutorial (nothing to show - would be empty)
    if (isTutorialActive) {
      return;
    }
    setCalendarOpen(true);
  }, [isTutorialActive]);

  // Handle settings button click
  const handleSettingsClick = useCallback(() => {
    // Block settings during tutorial until the settings stage
    if (isTutorialActive && !isSettingsStage) {
      return;
    }
    setSettingsOpen(true);
  }, [isTutorialActive, isSettingsStage]);

  // Handle date selection from calendar
  const handleCalendarSelect = useCallback(
    async (selectedDate: string) => {
      setCalendarOpen(false);
      setViewingDate(selectedDate);

      // Load this date for all active paths if not already loaded
      for (const path of activePaths) {
        if (!days[path][selectedDate]) {
          try {
            const calData = await fetchCalendar(selectedDate, path);
            const { halakhot, chapterBreaks } = await fetchHalakhot(
              calData.ref,
            );

            setDayData(path, selectedDate, {
              he: calData.he,
              en: calData.en,
              ref: calData.ref,
              refs: "refs" in calData ? calData.refs : undefined,
              count: halakhot.length,
              heDate: calData.heDate,
              enDate: calData.enDate,
              texts: halakhot,
              chapterBreaks,
            });
          } catch (error) {
            console.error(`Failed to load ${path}/${selectedDate}:`, error);
          }
        }
      }
    },
    [activePaths, days, setDayData],
  );

  // Handle location setup complete
  const handleLocationSetupComplete = useCallback(() => {
    setShowLocationDialog(false);
  }, []);

  // Check if we have any data to show
  const hasAnyData = sortedDates.length > 0;

  // Check if we're filtering to a specific date
  const isFiltering = viewingDate !== null;

  // Get display label for the filtered date
  const filterDateLabel = useMemo(() => {
    if (!viewingDate) return "";
    const dayData = pathDays[viewingDate];
    if (dayData) {
      return isHebrew
        ? dayData.heDate || viewingDate
        : dayData.enDate || viewingDate;
    }
    return viewingDate;
  }, [viewingDate, pathDays, isHebrew]);

  // Clear filter handler
  const handleClearFilter = useCallback(() => {
    setViewingDate(null);
  }, []);

  // Count summaries without subscribing to entire summaries object changes
  const summaryCount = Object.keys(summaries).length;

  return (
    <div className="app-shell">
      <Header
        onSettingsClick={handleSettingsClick}
        onCalendarClick={handleCalendarClick}
        onInstallClick={install}
        showInstallButton={canInstall && !isTutorialActive}
        isViewingOtherDate={viewingDate !== null && viewingDate !== today}
        forceDefaultColor={isTutorialActive}
      />

      {/* Hide stats bar during tutorial */}
      {!isTutorialActive && <StatsBar selectedDate={viewingDate} />}

      <main
        className={`px-0 sm:px-4 pb-24 pt-4 mx-auto ${
          contentWidth === "narrow"
            ? "max-w-2xl"
            : contentWidth === "medium"
              ? "max-w-4xl"
              : ""
        }`}
      >
        {/* Date filter indicator - shown when viewing a specific date */}
        {isFiltering && (
          <div
            className="mb-4 px-4 py-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl flex items-center justify-between"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 text-[var(--color-primary-dark)]">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">
                {t("filter.viewingDate", { date: filterDateLabel })}
              </span>
            </div>
            <button
              onClick={handleClearFilter}
              className="flex items-center gap-1 px-3 py-1.5 border-2 border-red-500 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {t("filter.showAll")}
            </button>
          </div>
        )}

        {/* Pre-hydration: show neutral loading so returning users don't see "Welcome" flash */}
        {!hasHydrated && (
          <div className="text-center py-16">
            <div className="text-6xl mb-6 animate-pulse">📚</div>
            <div className="flex justify-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* Show welcome when location not set up yet (only after hydration confirms it) */}
        {hasHydrated && !hasCompletedSetup && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t("welcome.title")}
            </div>
            <div className="text-[var(--color-text-muted)]">
              {t("welcome.setupLocation")}
            </div>
          </div>
        )}

        {/* Welcome message during tutorial */}
        {hasCompletedSetup && isTutorialActive && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t("welcome.title")}
            </div>
            <div className="text-[var(--color-text-muted)]">
              {t("tutorial.completeTutorial")}
            </div>
          </div>
        )}

        {/* Show loading after location is set up (only when not in tutorial) */}
        {hasCompletedSetup && !isTutorialActive && isLoading && !hasAnyData && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t("messages.loading")}
            </div>
            <div className="text-[var(--color-text-muted)] mb-4">
              {t("welcome.loading")}
            </div>
            <div className="flex justify-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* Show offline message when no cached data */}
        {hasCompletedSetup && !isLoading && !hasAnyData && isOffline && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📴</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t("offline.noConnection")}
            </div>
            <div className="text-[var(--color-text-muted)] mb-4">
              {t("offline.noData")}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
            >
              {t("offline.tryAgain")}
            </button>
          </div>
        )}

        {/* All complete message - shown when all active content is hidden */}
        {hasCompletedSetup &&
          !isLoading &&
          hasAnyData &&
          activeData.length === 0 &&
          hiddenCount === 0 &&
          !viewingDate && (
            <div
              className="text-center py-12 px-4"
              dir={isHebrew ? "rtl" : "ltr"}
            >
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                {t("messages.allComplete")}
              </div>
              <div className="text-[var(--color-text-muted)] mb-4">
                {t("messages.allCompleteHint")}
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
              >
                {t("messages.openSettings")}
              </button>
            </div>
          )}

        {/* Active (non-hidden) day groups */}
        {!isTutorialActive &&
          activeData.map(({ date, path, dayData }) => (
            <DayGroup
              key={`${path}:${date}`}
              date={date}
              dayData={dayData}
              studyPath={path}
              textLanguage={textLanguage}
              autoMarkPrevious={autoMarkPrevious}
              defaultOpen={date === today || viewingDate === date}
              showPathBadge={(activePaths?.length ?? 0) > 1}
            />
          ))}

        {/* Hidden entries toolbar — positioned ABOVE revealed items, sticky when expanded */}
        {!isTutorialActive && hiddenCount > 0 && !viewingDate && (
          <div
            className={`mt-4 ${
              showHidden
                ? "sticky z-20 mb-4 bg-[var(--color-surface-glass)] backdrop-blur-xl shadow-md border border-[var(--color-surface-border)] rounded-xl"
                : ""
            }`}
            style={
              showHidden
                ? { top: "var(--daygroup-sticky-top, 120px)" }
                : undefined
            }
            dir={isHebrew ? "rtl" : "ltr"}
          >
            {/* Toggle row */}
            <button
              onClick={() => {
                setShowHidden((prev) => {
                  if (prev) {
                    setRevealLimit(20);
                    setHiddenFilter("all");
                  }
                  return !prev;
                });
              }}
              className={`w-full px-4 py-3 transition-colors flex items-center justify-center gap-2 ${
                showHidden
                  ? "rounded-t-xl hover:bg-[var(--color-surface-hover)]"
                  : "bg-[var(--color-surface-hover)] border border-[var(--color-surface-border)] rounded-xl hover:bg-[var(--color-surface-border)]/50"
              }`}
            >
              {showHidden ? (
                <svg
                  className="w-4 h-4 text-[var(--color-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-[var(--color-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              )}
              <span className="text-sm text-[var(--color-text-muted)]">
                {showHidden
                  ? t("messages.shownEntries", { count: hiddenCount })
                  : t("messages.hiddenEntries", { count: hiddenCount })}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                ·{" "}
                {showHidden ? t("messages.tapToHide") : t("messages.tapToShow")}
              </span>
            </button>

            {/* Filter chips row — only when expanded */}
            {showHidden && (
              <div className="px-3 pb-3 pt-1 flex gap-2 overflow-x-auto">
                {(
                  [
                    { key: "all" as const, label: t("messages.filterAll") },
                    {
                      key: "bookmarked" as const,
                      label: t("messages.filterBookmarked"),
                    },
                    {
                      key: "hasNote" as const,
                      label: t("messages.filterHasNote"),
                    },
                    {
                      key: "noNote" as const,
                      label: t("messages.filterNoNote"),
                    },
                  ] as const
                )
                  .filter(({ key }) => key === "all" || filterCounts[key] > 0)
                  .map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setHiddenFilter(key);
                        setRevealLimit(20);
                      }}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        hiddenFilter === key
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-border)]"
                      }`}
                    >
                      {label} ({filterCounts[key]})
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Revealed hidden day groups */}
        {!isTutorialActive &&
          revealedData.map(({ date, path, dayData }) => (
            <DayGroup
              key={`hidden:${path}:${date}`}
              date={date}
              dayData={dayData}
              studyPath={path}
              textLanguage={textLanguage}
              autoMarkPrevious={autoMarkPrevious}
              defaultOpen={false}
              showPathBadge={(activePaths?.length ?? 0) > 1}
            />
          ))}

        {/* Show more button — when there are more filtered hidden items to reveal */}
        {!isTutorialActive &&
          showHidden &&
          filteredHiddenCount > revealedData.length && (
            <button
              onClick={() => setRevealLimit((prev) => prev + 20)}
              className="w-full mt-4 px-4 py-3 bg-[var(--color-surface-hover)] border border-[var(--color-surface-border)] rounded-xl hover:bg-[var(--color-surface-border)]/50 transition-colors text-sm text-[var(--color-text-muted)]"
            >
              {t("messages.showMore", {
                count: filteredHiddenCount - revealedData.length,
              })}
            </button>
          )}

        {/* Journal button - shows when user has saved summaries */}
        {!isTutorialActive && summaryCount > 0 && (
          <button
            onClick={() => setShowSummaries(true)}
            className="w-full mt-6 px-4 py-3 bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/20 rounded-xl hover:bg-[var(--color-primary)]/12 transition-colors flex items-center justify-center gap-2"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <span className="text-xl">💭</span>
            <span className="font-medium text-[var(--color-primary-dark)]">
              {t("summary.viewAll")}
            </span>
            <span className="text-xs text-[var(--color-primary)] opacity-60">
              {t("summary.entries", {
                count: summaryCount,
              })}
            </span>
          </button>
        )}
      </main>

      <SummariesList
        isOpen={showSummaries}
        onClose={() => setShowSummaries(false)}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <InstallPrompt />

      {/* Location setup dialog - shown on first visit */}
      <LocationSetupDialog
        isOpen={showLocationDialog}
        onComplete={handleLocationSetupComplete}
      />

      {/* Calendar modal for date selection */}
      <Calendar
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={viewingDate || today}
        onDateSelect={handleCalendarSelect}
        today={today}
        startDate={startDate}
      />

      {/* Scroll to first incomplete FAB - show during jump-button tutorial stage */}
      {hasCompletedSetup &&
        !viewingDate &&
        (!isTutorialActive || isJumpButtonStage) && (
          <ScrollToIncompleteFAB
            activePaths={activePaths}
            days={days}
            sortedDates={sortedDates}
          />
        )}

      {/* Tutorial overlay - shown only after onboarding is complete */}
      {hasCompletedSetup && <Tutorial />}
    </div>
  );
}
