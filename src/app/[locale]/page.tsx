"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import { useJewishDate } from "@/hooks/useJewishDate";
import { Header } from "@/components/layout/Header";
import { StatsBar } from "@/components/layout/StatsBar";
import { DayGroup } from "@/components/halakha/DayGroup";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { LocationSetupDialog } from "@/components/location/LocationSetupDialog";
import {
  InstallPrompt,
  useInstallPrompt,
} from "@/components/pwa/InstallPrompt";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { fetchCalendar, fetchHalakhot } from "@/services/sefaria";
import { fetchHebrewDate } from "@/services/hebcal";
import { dateRange } from "@/lib/dates";
import type { DayData, StudyPath } from "@/types";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

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

  // Install prompt
  const { canInstall, install } = useInstallPrompt();

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

  // Show location dialog on first visit (if location not set up)
  useEffect(() => {
    if (!hasCompletedSetup) {
      setShowLocationDialog(true);
    }
  }, [hasCompletedSetup]);

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
            const heDate = await fetchHebrewDate(date);

            return {
              date,
              data: {
                he: calData.he,
                en: calData.en,
                ref: calData.ref,
                count: halakhot.length,
                heDate: heDate || undefined,
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

  // Handle calendar button
  const handleCalendarClick = useCallback(() => {
    if (viewingDate) {
      // Return to normal view
      setViewingDate(null);
    } else {
      // Open date picker
      datePickerRef.current?.showPicker();
    }
  }, [viewingDate]);

  const handleDateSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedDate = e.target.value;
      if (!selectedDate) return;

      setViewingDate(selectedDate);

      // Load this date if not already loaded
      if (!pathDays[selectedDate]) {
        try {
          const calData = await fetchCalendar(selectedDate, studyPath);
          const { halakhot, chapterBreaks } = await fetchHalakhot(calData.ref);
          const heDate = await fetchHebrewDate(selectedDate);

          setDayData(studyPath, selectedDate, {
            he: calData.he,
            en: calData.en,
            ref: calData.ref,
            count: halakhot.length,
            heDate: heDate || undefined,
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

  return (
    <div className="container">
      {/* Hidden date picker */}
      <input
        ref={datePickerRef}
        type="date"
        className="hidden"
        onChange={handleDateSelect}
        aria-label="בחר תאריך"
      />

      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onCalendarClick={handleCalendarClick}
        onInstallClick={install}
        showInstallButton={canInstall}
        isViewingOtherDate={viewingDate !== null && viewingDate !== today}
      />

      <StatsBar />

      <main className="p-4 pb-8">
        {/* Show welcome when location not set up yet */}
        {!hasCompletedSetup && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">
              ברוכים הבאים!
            </div>
            <div className="text-gray-500">הגדר את מיקומך כדי להתחיל</div>
          </div>
        )}

        {/* Show loading after location is set up */}
        {hasCompletedSetup && isLoading && sortedDates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">טוען...</div>
            <div className="text-gray-500">טוען את הלימוד היומי שלך...</div>
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
    </div>
  );
}
