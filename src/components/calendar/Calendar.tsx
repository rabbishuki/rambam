"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { useHebrewMonthCompletion } from "@/hooks/useMonthCompletion";
import { useMultiPathHebrewMonthCompletion } from "@/hooks/useMultiPathCompletion";
import { useAppStore } from "@/stores/appStore";
import {
  getHebrewMonthData,
  getNextHebrewMonth,
  getPrevHebrewMonth,
  type HebrewMonthData,
} from "@/lib/hebrewCalendar";

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD (Gregorian)
  onDateSelect: (date: string) => void;
  today: string;
  startDate: string; // Cycle start (e.g., 2026-02-03)
}

/**
 * Calendar modal component for date selection with completion indicators
 * Displays Hebrew calendar months with gematriya day numbers
 */
export function Calendar({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  today,
  startDate,
}: CalendarProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const isHebrew = locale === "he";

  // Compute initial Hebrew month from the target date
  const targetDate = selectedDate || today;
  const initialHebrewMonth = useMemo(() => {
    const [year, month, day] = targetDate.split("-").map(Number);
    return getHebrewMonthData(new Date(year, month - 1, day));
  }, [targetDate]);

  // Track current Hebrew month data
  const [hebrewMonth, setHebrewMonth] =
    useState<HebrewMonthData>(initialHebrewMonth);

  // Reset to initial month when target date changes
  const [lastTargetDate, setLastTargetDate] = useState(targetDate);
  if (targetDate !== lastTargetDate) {
    const [year, month, day] = targetDate.split("-").map(Number);
    setHebrewMonth(getHebrewMonthData(new Date(year, month - 1, day)));
    setLastTargetDate(targetDate);
  }

  // Get active paths count to determine if we should use multi-path mode
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const useMultiPathMode = activePaths.length > 1;

  // Get bookmarks and summaries for indicator icons
  const bookmarks = useAppStore((state) => state.bookmarks);
  const summaries = useAppStore((state) => state.summaries);

  // Get completion data for the displayed Hebrew month
  // Uses Gregorian dates from the Hebrew month's days array
  const completionMap = useHebrewMonthCompletion(hebrewMonth.days);
  const multiPathCompletionMap = useMultiPathHebrewMonthCompletion(
    hebrewMonth.days,
  );

  // Compute sets of dates with bookmarks and summaries
  const { bookmarkDates, summaryDates } = useMemo(() => {
    const bDates = new Set<string>();
    const sDates = new Set<string>();

    // Extract dates from bookmark keys (format: "path:date:index")
    Object.keys(bookmarks).forEach((key) => {
      const parts = key.split(":");
      if (parts.length >= 2) {
        bDates.add(parts[1]); // date is second part
      }
    });

    // Extract dates from summary keys (format: "path:date")
    Object.keys(summaries).forEach((key) => {
      const parts = key.split(":");
      if (parts.length >= 2) {
        sDates.add(parts[1]); // date is second part
      }
    });

    return { bookmarkDates: bDates, summaryDates: sDates };
  }, [bookmarks, summaries]);

  // Navigate to previous Hebrew month
  const handlePreviousMonth = useCallback(() => {
    setHebrewMonth((current) => getPrevHebrewMonth(current));
  }, []);

  // Navigate to next Hebrew month
  const handleNextMonth = useCallback(() => {
    setHebrewMonth((current) => getNextHebrewMonth(current));
  }, []);

  // Handle date selection (receives Gregorian date from grid)
  const handleDateSelect = useCallback(
    (date: string) => {
      // Don't select future dates or dates before cycle start
      if (date > today || date < startDate) {
        return;
      }
      onDateSelect(date);
      onClose();
    },
    [today, startDate, onDateSelect, onClose],
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay/Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
      >
        {/* Modal content */}
        <div
          className="bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-md overflow-hidden"
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {/* Title bar with close button */}
          <div className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between">
            <h2 id="calendar-title" className="text-lg font-bold">
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-xl transition-colors"
              aria-label={t("close")}
            >
              ×
            </button>
          </div>

          {/* Month navigation header */}
          <CalendarHeader
            hebrewMonthName={hebrewMonth.monthName}
            hebrewYearDisplay={hebrewMonth.yearDisplay}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Calendar grid */}
          <CalendarGrid
            hebrewDays={hebrewMonth.days}
            today={today}
            selectedDate={selectedDate}
            startDate={startDate}
            completionMap={completionMap}
            multiPathCompletionMap={
              useMultiPathMode ? multiPathCompletionMap : undefined
            }
            bookmarkDates={bookmarkDates}
            summaryDates={summaryDates}
            onDateSelect={handleDateSelect}
          />

          {/* Legend */}
          <div
            className="px-4 pb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[var(--color-text-secondary)]"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-200 flex items-center justify-center">
                <span className="text-green-700 text-[8px] font-bold">✓</span>
              </div>
              <span>{t("complete")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-200 flex items-center justify-center">
                <span className="text-amber-700 text-[6px]">50%</span>
              </div>
              <span>{t("partial", { percent: "%" })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded ring-2 ring-[var(--color-primary)]" />
              <span>{t("today")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative w-4 h-4 rounded bg-gray-100">
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-blue-500 border-r-blue-500 border-l-[6px] border-b-[6px] border-l-transparent border-b-transparent rounded-tr" />
              </div>
              <span>{t("bookmark")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative w-4 h-4 rounded bg-gray-100">
                <div className="absolute top-0 left-0 w-0 h-0 border-t-[6px] border-l-[6px] border-t-emerald-500 border-l-emerald-500 border-r-[6px] border-b-[6px] border-r-transparent border-b-transparent rounded-tl" />
              </div>
              <span>{t("note")}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
