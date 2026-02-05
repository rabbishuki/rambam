"use client";

import { useLocale } from "next-intl";
import { CalendarDay, EmptyDay } from "./CalendarDay";
import type { DayCompletionStatus } from "@/hooks/useMonthCompletion";
import type { MultiPathDayStatus } from "@/hooks/useMultiPathCompletion";
import type { HebrewDayData } from "@/lib/hebrewCalendar";

interface CalendarGridProps {
  /** Array of Hebrew days for the current month */
  hebrewDays: HebrewDayData[];
  today: string;
  selectedDate: string;
  startDate: string;
  completionMap: Record<string, DayCompletionStatus>;
  /** Multi-path completion map (optional, for multi-path mode) */
  multiPathCompletionMap?: Record<string, MultiPathDayStatus>;
  onDateSelect: (date: string) => void;
}

/**
 * Calendar grid showing Hebrew month with day headers and completion indicators
 * Days are displayed using Hebrew gematriya (א׳, ב׳, ג׳... כ״ט, ל׳)
 */
export function CalendarGrid({
  hebrewDays,
  today,
  selectedDate,
  startDate,
  completionMap,
  multiPathCompletionMap,
  onDateSelect,
}: CalendarGridProps) {
  const locale = useLocale();
  const isHebrew = locale === "he";

  // Build grid with empty cells for alignment
  // First day of Hebrew month tells us where to start
  const firstDayOfWeek = hebrewDays.length > 0 ? hebrewDays[0].dayOfWeek : 0;

  // Create grid data with leading empty cells
  const gridData: (HebrewDayData | null)[] = [];

  // Add empty cells before the 1st of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridData.push(null);
  }

  // Add the actual days
  for (const day of hebrewDays) {
    gridData.push(day);
  }

  // No padding for the last row - saves vertical space

  return (
    <div className="px-4 py-2">
      {/* Calendar grid - day names are in sticky header */}
      <div
        className="grid grid-cols-7 gap-1"
        dir={isHebrew ? "rtl" : "ltr"}
        role="grid"
        aria-label="Calendar"
      >
        {gridData.map((day, index) => {
          if (day === null) {
            return <EmptyDay key={`empty-${index}`} />;
          }

          const dateStr = day.gregorianDate;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > today;
          const isBeforeStart = dateStr < startDate;

          // Display Hebrew day number (gematriya) or English number based on locale
          const dayDisplay = isHebrew ? day.display.he : day.display.en;

          return (
            <CalendarDay
              key={dateStr}
              date={dateStr}
              dayDisplay={dayDisplay}
              isToday={isToday}
              isSelected={isSelected}
              isFuture={isFuture}
              isBeforeStart={isBeforeStart}
              completionStatus={completionMap[dateStr] || null}
              multiPathStatus={multiPathCompletionMap?.[dateStr] || null}
              onClick={() => onDateSelect(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}
