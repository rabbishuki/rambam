"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import { useJewishDate } from "@/hooks/useJewishDate";
import { Header } from "@/components/layout/Header";
import { StatsBar } from "@/components/layout/StatsBar";
import { DayGroup } from "@/components/halakha/DayGroup";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { LocationSetupDialog } from "@/components/location/LocationSetupDialog";
import { Calendar } from "@/components/calendar";
import {
  InstallPrompt,
  useInstallPrompt,
} from "@/components/pwa/InstallPrompt";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { initializeOffline } from "@/services/offlineInit";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { fetchCalendar, fetchHalakhot } from "@/services/sefaria";
import { fetchHebrewDate } from "@/services/hebcal";
import { dateRange } from "@/lib/dates";
import type { DayData, StudyPath } from "@/types";

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations();
  const isHebrew = locale === "he";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDate, setViewingDate] = useState<string | null>(null);

  // App store
  const studyPath = useAppStore((state) => state.studyPath);
  const textLanguage = useAppStore((state) => state.textLanguage);
  const autoMarkPrevious = useAppStore((state) => state.autoMarkPrevious);
  const startDates = useAppStore((state) => state.startDates);
  const days = useAppStore((state) => state.days);
  const hasMigratedLegacy = useAppStore((state) => state.hasMigratedLegacy);
  const setDaysData = useAppStore((state) => state.setDaysData);
  const setDayData = useAppStore((state) => state.setDayData);
  const setMigrated = useAppStore((state) => state.setMigrated);
  const setStartDate = useAppStore((state) => state.setStartDate);
  const markComplete = useAppStore((state) => state.markComplete);

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

  // Current path's data
  const startDate = startDates[studyPath];
  const pathDays = days[studyPath];

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
          Object.entries(parsedDone).forEach(([key, _value]) => {
            // Old format: "date:index" -> new format: "path:date:index"
            const parts = key.split(":");
            if (parts.length === 2) {
              const [date, indexStr] = parts;
              const index = parseInt(indexStr);
              markComplete(legacyPath, date, index);
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
  }, [hasMigratedLegacy, setMigrated, setStartDate, setDaysData, markComplete]);

  // Initialize offline-first infrastructure (IndexedDB, background sync, cleanup)
  useEffect(() => {
    initializeOffline();
  }, []);

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

  // Load missing days data (only after location is set up)
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
        const missingDates = allDates.filter((date) => !pathDays[date]);

        if (missingDates.length === 0) {
          setIsLoading(false);
          return;
        }

        // Fetch all missing dates in parallel
        const results = await Promise.allSettled(
          missingDates.map(async (date) => {
            const calData = await fetchCalendar(date, studyPath);
            const { halakhot, chapterBreaks } = await fetchHalakhot(
              calData.ref,
            );

            // Use cached Hebrew dates if available, otherwise fetch
            let heDate = calData.heDate;
            let enDate = calData.enDate;
            if (!heDate || !enDate) {
              const dateResult = await fetchHebrewDate(date);
              heDate = dateResult?.he;
              enDate = dateResult?.en;
            }

            return {
              date,
              data: {
                he: calData.he,
                en: calData.en,
                ref: calData.ref,
                count: halakhot.length,
                heDate,
                enDate,
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
              `Failed to load ${missingDates[index]}:`,
              result.reason,
            );
          }
        });

        if (Object.keys(newDays).length > 0) {
          setDaysData(studyPath, newDays);
        }
      } catch (error) {
        console.error("Failed to load days:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMissingDays();
  }, [startDate, today, studyPath, pathDays, setDaysData, hasCompletedSetup]);

  // Get sorted dates (newest first)
  const sortedDates = Object.keys(pathDays)
    .filter((date) => date <= today && date >= startDate)
    .sort((a, b) => b.localeCompare(a));

  // Handle calendar button click
  const handleCalendarClick = useCallback(() => {
    if (viewingDate) {
      // Return to normal view (today)
      setViewingDate(null);
    } else {
      // Open calendar modal
      setCalendarOpen(true);
    }
  }, [viewingDate]);

  // Handle date selection from calendar
  const handleCalendarSelect = useCallback(
    async (selectedDate: string) => {
      setCalendarOpen(false);
      setViewingDate(selectedDate);

      // Load this date if not already loaded
      if (!pathDays[selectedDate]) {
        try {
          const calData = await fetchCalendar(selectedDate, studyPath);
          const { halakhot, chapterBreaks } = await fetchHalakhot(calData.ref);

          // Use cached Hebrew dates if available, otherwise fetch
          let heDate = calData.heDate;
          let enDate = calData.enDate;
          if (!heDate || !enDate) {
            const dateResult = await fetchHebrewDate(selectedDate);
            heDate = dateResult?.he;
            enDate = dateResult?.en;
          }

          setDayData(studyPath, selectedDate, {
            he: calData.he,
            en: calData.en,
            ref: calData.ref,
            count: halakhot.length,
            heDate,
            enDate,
            texts: halakhot,
            chapterBreaks,
          });
        } catch (error) {
          console.error("Failed to load selected date:", error);
        }
      }
    },
    [pathDays, studyPath, setDayData],
  );

  // Handle location setup complete
  const handleLocationSetupComplete = useCallback(() => {
    setShowLocationDialog(false);
  }, []);

  // Dates to display
  const displayDates = viewingDate ? [viewingDate] : sortedDates;

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

  return (
    <div className="container">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onCalendarClick={handleCalendarClick}
        onInstallClick={install}
        showInstallButton={canInstall}
        isViewingOtherDate={viewingDate !== null && viewingDate !== today}
      />

      <StatsBar />

      <main className="p-4 pb-8">
        {/* Date filter indicator - shown when viewing a specific date */}
        {isFiltering && (
          <div
            className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 text-blue-800">
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
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
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

        {/* Show welcome when location not set up yet */}
        {!hasCompletedSetup && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {t("welcome.title")}
            </div>
            <div className="text-gray-500">{t("welcome.setupLocation")}</div>
          </div>
        )}

        {/* Show loading after location is set up */}
        {hasCompletedSetup && isLoading && sortedDates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {t("messages.loading")}
            </div>
            <div className="text-gray-500">{t("welcome.loading")}</div>
          </div>
        )}

        {/* Show offline message when no cached data */}
        {hasCompletedSetup &&
          !isLoading &&
          sortedDates.length === 0 &&
          isOffline && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📴</div>
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {t("offline.noConnection")}
              </div>
              <div className="text-gray-500 mb-4">{t("offline.noData")}</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t("offline.tryAgain")}
              </button>
            </div>
          )}

        {displayDates.map((date) => {
          const dayData = pathDays[date];
          if (!dayData) return null;

          return (
            <DayGroup
              key={date}
              date={date}
              dayData={dayData}
              studyPath={studyPath}
              textLanguage={textLanguage}
              autoMarkPrevious={autoMarkPrevious}
              defaultOpen={date === today || viewingDate === date}
            />
          );
        })}
      </main>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <InstallPrompt />
      <UpdateBanner />

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
    </div>
  );
}
