"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarGrid } from "./CalendarGrid";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useHebrewMonthCompletion } from "@/hooks/useMonthCompletion";
import { useMultiPathHebrewMonthCompletion } from "@/hooks/useMultiPathCompletion";
import { useAppStore, isDayComplete } from "@/stores/appStore";
import type { HebrewMonthData } from "@/lib/hebrewCalendar";

interface InfiniteCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD (Gregorian)
  onDateSelect: (date: string) => void;
  today: string;
  startDate: string; // Cycle start (e.g., 2026-02-03)
}

/**
 * Single month component with sticky header
 */
function CalendarMonth({
  month,
  today,
  selectedDate,
  startDate,
  onDateSelect,
  monthIndex,
  isHebrew,
  bookmarkDates,
  summaryDates,
}: {
  month: HebrewMonthData;
  today: string;
  selectedDate: string;
  startDate: string;
  onDateSelect: (date: string) => void;
  monthIndex: number;
  isHebrew: boolean;
  bookmarkDates: Set<string>;
  summaryDates: Set<string>;
}) {
  // Get active paths count to determine if we should use multi-path mode
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const useMultiPathMode = activePaths.length > 1;

  // Get completion data for this month
  const completionMap = useHebrewMonthCompletion(month.days);
  const multiPathCompletionMap = useMultiPathHebrewMonthCompletion(month.days);

  // Format display: "שבט ה׳תשפ״ו" or "Sh'vat 5786"
  const displayText = isHebrew
    ? `${month.monthName.he} ${month.yearDisplay.he}`
    : `${month.monthName.en} ${month.yearDisplay.en}`;

  return (
    <div
      data-month-index={monthIndex}
      data-month-key={`${month.year}-${month.month}`}
    >
      {/* Sticky month header */}
      <div
        className="sticky top-0 z-10 bg-[var(--color-surface-hover)] px-4 py-2 border-b border-[var(--color-surface-border)]"
        dir={isHebrew ? "rtl" : "ltr"}
      >
        <span className="text-base font-semibold text-gray-700">
          {displayText}
        </span>
      </div>

      {/* Calendar grid for this month */}
      <CalendarGrid
        hebrewDays={month.days}
        today={today}
        selectedDate={selectedDate}
        startDate={startDate}
        completionMap={completionMap}
        multiPathCompletionMap={
          useMultiPathMode ? multiPathCompletionMap : undefined
        }
        bookmarkDates={bookmarkDates}
        summaryDates={summaryDates}
        onDateSelect={onDateSelect}
      />
    </div>
  );
}

/**
 * Infinite scroll calendar modal
 * Displays Hebrew calendar months with bi-directional infinite scroll
 */
export function InfiniteCalendar({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  today,
  startDate,
}: InfiniteCalendarProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const isHebrew = locale === "he";

  const [currentViewDate, setCurrentViewDate] = useState(selectedDate || today);

  // Get store data for finding incomplete days
  const rawActivePaths = useAppStore((state) => state.activePaths);
  const activePaths = useMemo(
    () => rawActivePaths ?? ["rambam3"],
    [rawActivePaths],
  );
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);

  // Get bookmarks and summaries for indicator icons
  const bookmarks = useAppStore((state) => state.bookmarks);
  const summaries = useAppStore((state) => state.summaries);

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

  // Calculate max date (5 months from today for testing)
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 5);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [today]);

  // Use the infinite scroll hook
  const {
    months,
    loadPreviousMonths,
    loadNextMonths,
    scrollToDate,
    canLoadPrevious,
    canLoadNext,
    containerRef,
  } = useInfiniteScroll({
    initialDate: selectedDate || today,
    minDate: startDate,
    maxDate,
    bufferSize: 2,
  });

  // Generate list of all valid dates for finding incomplete days
  const allDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(today);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  }, [startDate, today]);

  // Find the next incomplete day (searching forward from current view date)
  const findNextIncomplete = useCallback(
    (fromDate: string): string | null => {
      const currentIdx = allDates.indexOf(fromDate);
      if (currentIdx === -1) return null;

      for (let i = currentIdx + 1; i < allDates.length; i++) {
        const date = allDates[i];
        for (const path of activePaths) {
          const dayData = days[path]?.[date];
          if (dayData && !isDayComplete(done, path, date, dayData.count)) {
            return date;
          }
        }
      }
      return null;
    },
    [allDates, activePaths, days, done],
  );

  // Find the previous incomplete day (searching backward from current view date)
  const findPrevIncomplete = useCallback(
    (fromDate: string): string | null => {
      const currentIdx = allDates.indexOf(fromDate);
      if (currentIdx === -1) return null;

      for (let i = currentIdx - 1; i >= 0; i--) {
        const date = allDates[i];
        for (const path of activePaths) {
          const dayData = days[path]?.[date];
          if (dayData && !isDayComplete(done, path, date, dayData.count)) {
            return date;
          }
        }
      }
      return null;
    },
    [allDates, activePaths, days, done],
  );

  // Memoized values for whether there are incomplete days in each direction
  const nextIncompleteDate = useMemo(
    () => findNextIncomplete(currentViewDate),
    [findNextIncomplete, currentViewDate],
  );
  const prevIncompleteDate = useMemo(
    () => findPrevIncomplete(currentViewDate),
    [findPrevIncomplete, currentViewDate],
  );

  // Handlers for jumping to incomplete days
  const handleJumpToNextIncomplete = useCallback(() => {
    if (nextIncompleteDate) {
      scrollToDate(nextIncompleteDate);
      setCurrentViewDate(nextIncompleteDate);
    }
  }, [nextIncompleteDate, scrollToDate]);

  const handleJumpToPrevIncomplete = useCallback(() => {
    if (prevIncompleteDate) {
      scrollToDate(prevIncompleteDate);
      setCurrentViewDate(prevIncompleteDate);
    }
  }, [prevIncompleteDate, scrollToDate]);

  // Handle date selection
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

  // Handle scroll events for infinite loading and FAB visibility
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Load more months when near edges
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const threshold = 200;

    // Load previous months when scrolling near top
    if (scrollTop < threshold && canLoadPrevious) {
      const oldScrollHeight = scrollHeight;
      loadPreviousMonths();
      // Maintain scroll position after loading
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = scrollTop + (newScrollHeight - oldScrollHeight);
      });
    }

    // Load next months when scrolling near bottom
    if (scrollHeight - scrollTop - clientHeight < threshold && canLoadNext) {
      loadNextMonths();
    }

    // Update current view date based on which month is most visible
    const allMonthElements = container.querySelectorAll("[data-month-index]");
    let mostVisibleMonth: Element | null = null;
    let maxVisibleArea = 0;

    allMonthElements.forEach((monthEl) => {
      const rect = monthEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleArea = Math.max(0, visibleBottom - visibleTop);

      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        mostVisibleMonth = monthEl;
      }
    });

    const visibleMonth = mostVisibleMonth as Element | null;
    if (visibleMonth) {
      const monthIdx = parseInt(
        visibleMonth.getAttribute("data-month-index") || "0",
        10,
      );
      if (months[monthIdx]) {
        // Use the first day of the most visible month as the current view date
        const firstDay = months[monthIdx].days[0];
        if (firstDay) {
          setCurrentViewDate(firstDay.gregorianDate);
        }
      }
    }
  }, [
    canLoadPrevious,
    canLoadNext,
    loadPreviousMonths,
    loadNextMonths,
    months,
    containerRef,
  ]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen, handleScroll, containerRef]);

  // Scroll to the selected date when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Find and scroll to the month containing the selected date
      const targetDate = selectedDate || today;
      const monthIndex = months.findIndex((month) =>
        month.days.some((day) => day.gregorianDate === targetDate),
      );

      if (monthIndex !== -1) {
        requestAnimationFrame(() => {
          const monthElement = containerRef.current?.querySelector(
            `[data-month-index="${monthIndex}"]`,
          );
          monthElement?.scrollIntoView({ behavior: "auto", block: "start" });
        });
      }
    }
  }, [isOpen, months, selectedDate, today, containerRef]);

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

  // Jump to today handler
  const handleJumpToToday = useCallback(() => {
    scrollToDate(today);
  }, [scrollToDate, today]);

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
          className="bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {/* Title bar with close button */}
          <div className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between shrink-0">
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

          {/* Day names header - fixed at top */}
          <DayNamesHeader isHebrew={isHebrew} />

          {/* Scrollable calendar container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            {/* Loading indicator at top */}
            {canLoadPrevious && (
              <div className="flex justify-center py-2 text-[var(--color-text-muted)]">
                <span className="text-sm">{t("loadingMore")}</span>
              </div>
            )}

            {/* Months */}
            {months.map((month, index) => (
              <CalendarMonth
                key={`${month.year}-${month.month}`}
                month={month}
                today={today}
                selectedDate={selectedDate}
                startDate={startDate}
                onDateSelect={handleDateSelect}
                monthIndex={index}
                isHebrew={isHebrew}
                bookmarkDates={bookmarkDates}
                summaryDates={summaryDates}
              />
            ))}

            {/* Loading indicator at bottom */}
            {canLoadNext && (
              <div className="flex justify-center py-2 text-[var(--color-text-muted)]">
                <span className="text-sm">{t("loadingMore")}</span>
              </div>
            )}
          </div>

          {/* Navigation bottom bar */}
          <div
            className="border-t border-[var(--color-surface-border)] bg-[var(--color-surface)] shrink-0"
            dir={isHebrew ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between">
              {/* Previous incomplete */}
              <button
                type="button"
                onClick={handleJumpToPrevIncomplete}
                disabled={!prevIncompleteDate}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors
                  ${
                    prevIncompleteDate
                      ? "text-amber-600 hover:bg-amber-50 active:bg-amber-100"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                aria-label={t("prevIncomplete")}
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
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-[var(--color-surface-border)]" />

              {/* Jump to today */}
              <button
                type="button"
                onClick={handleJumpToToday}
                className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 active:bg-[var(--color-primary)]/10 transition-colors"
                aria-label={t("jumpToToday")}
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{t("jumpToToday")}</span>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-[var(--color-surface-border)]" />

              {/* Next incomplete */}
              <button
                type="button"
                onClick={handleJumpToNextIncomplete}
                disabled={!nextIncompleteDate}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors
                  ${
                    nextIncompleteDate
                      ? "text-amber-600 hover:bg-amber-50 active:bg-amber-100"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                aria-label={t("nextIncomplete")}
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Legend - below navigation */}
            <div className="px-4 py-2.5 border-t border-[var(--color-surface-border)] flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-green-200 flex items-center justify-center">
                  <span className="text-green-700 text-[8px] font-bold">✓</span>
                </div>
                <span>{t("complete")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-amber-200" />
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
      </div>
    </>
  );
}

/**
 * Day names header component (Sunday-Saturday)
 */
function DayNamesHeader({ isHebrew }: { isHebrew: boolean }) {
  const t = useTranslations("calendar");
  const dayNames: string[] = t.raw("dayNamesShort") as string[];

  return (
    <div
      className="grid grid-cols-7 gap-1.5 px-4 py-2 border-b border-[var(--color-surface-border)] bg-[var(--color-surface)] shrink-0"
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {dayNames.map((name, index) => (
        <div
          key={index}
          className="h-6 flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)]"
        >
          {name}
        </div>
      ))}
    </div>
  );
}
