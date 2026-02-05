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

  // Get completion data for the displayed Hebrew month
  // Uses Gregorian dates from the Hebrew month's days array
  const completionMap = useHebrewMonthCompletion(hebrewMonth.days);
  const multiPathCompletionMap = useMultiPathHebrewMonthCompletion(
    hebrewMonth.days,
  );

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
          className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {/* Title bar with close button */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
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
            onDateSelect={handleDateSelect}
          />

          {/* Legend */}
          <div
            className="px-4 pb-4 flex items-center justify-center gap-4 text-xs text-gray-500"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-[8px]">✓</span>
              </div>
              <span>{t("complete")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-amber-50 flex items-center justify-center">
                <span className="text-amber-600 text-[6px]">50%</span>
              </div>
              <span>{t("partial", { percent: "%" })}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded ring-2 ring-blue-500" />
              <span>{t("today")}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
