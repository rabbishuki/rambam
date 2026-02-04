"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore, countCompleted, isDayComplete } from "@/stores/appStore";
import { useHalakhaData } from "@/hooks/useHalakhaData";
import { useJewishDate } from "@/hooks/useJewishDate";
import { formatGregorianDate } from "@/lib/dates";
import { HalakhaCard } from "./HalakhaCard";
import { ChapterDivider } from "./ChapterDivider";
import type { DayData, StudyPath, TextLanguage } from "@/types";

interface DayGroupProps {
  date: string;
  dayData: DayData;
  studyPath: StudyPath;
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
  defaultOpen?: boolean;
  onScrollToIncomplete?: () => void;
}

export function DayGroup({
  date,
  dayData,
  studyPath,
  textLanguage,
  autoMarkPrevious,
  defaultOpen = false,
  onScrollToIncomplete,
}: DayGroupProps) {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === "he";
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useJewishDate();

  const done = useAppStore((state) => state.done);
  const markAllComplete = useAppStore((state) => state.markAllComplete);
  const resetDay = useAppStore((state) => state.resetDay);

  const { halakhot, chapterBreaks, isLoading, error } = useHalakhaData(
    isOpen ? dayData.ref : "",
    date,
    isOpen ? dayData.refs : undefined, // Pass multiple refs for Sefer HaMitzvot
  );

  const doneCount = countCompleted(done, studyPath, date);
  const isComplete = isDayComplete(done, studyPath, date, dayData.count);
  const isToday = date === today;
  const dateLabel = isToday
    ? t("dates.today")
    : dayData.heDate || formatGregorianDate(date);

  // Arrow direction: RTL uses ◀, LTR uses ▶
  const arrow = isRTL ? "◀" : "▶";
  // Display title based on locale
  const displayTitle = isRTL ? dayData.he : dayData.en || dayData.he;

  // Scroll to first incomplete card when opened
  useEffect(() => {
    if (isOpen && halakhot.length > 0 && !isComplete && containerRef.current) {
      const timer = setTimeout(() => {
        const firstIncomplete = containerRef.current?.querySelector(
          ".halakha-card:not(.completed)",
        ) as HTMLElement;
        if (firstIncomplete) {
          firstIncomplete.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        onScrollToIncomplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, halakhot.length, isComplete, onScrollToIncomplete]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleCompleteAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const msg = t("messages.confirmMarkAll", { title: displayTitle });
      if (window.confirm(msg)) {
        markAllComplete(studyPath, date, dayData.count);
      }
    },
    [markAllComplete, studyPath, date, dayData.count, displayTitle, t],
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const msg = t("messages.confirmReset", { title: displayTitle });
      if (window.confirm(msg)) {
        resetDay(studyPath, date);
      }
    },
    [resetDay, studyPath, date, displayTitle, t],
  );

  const handleMarkComplete = useCallback((index: number) => {
    // Find and scroll to next card
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll("[data-index]");
      const nextCard = Array.from(cards).find(
        (card) => parseInt(card.getAttribute("data-index") || "0") > index,
      ) as HTMLElement;
      if (nextCard) {
        setTimeout(() => {
          nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, []);

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={`
        mb-4 border rounded-xl overflow-hidden bg-white
        ${isComplete ? "opacity-60 border-green-500" : "border-gray-200"}
      `}
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          handleToggle();
        }}
        className="px-4 py-3 cursor-pointer select-none list-none bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 hover:bg-gray-50 active:bg-gray-100"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            {arrow}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-800 truncate">
              {displayTitle}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {dateLabel} • {doneCount}/{dayData.count}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Complete all button */}
          {!isComplete && (
            <button
              onClick={handleCompleteAll}
              className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-black/5 hover:text-gray-600 active:bg-black/10 text-xl"
              title={t("actions.markComplete")}
              aria-label={t("actions.markComplete")}
            >
              ✓
            </button>
          )}

          {/* Reset button */}
          {doneCount > 0 && (
            <button
              onClick={handleReset}
              className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-black/5 hover:text-gray-600 active:bg-black/10 text-2xl"
              title={t("actions.reset")}
              aria-label={t("actions.reset")}
            >
              ↺
            </button>
          )}
        </div>
      </summary>

      <div ref={containerRef} className="p-4 flex flex-col gap-3">
        {isLoading && (
          <div className="text-center py-8 text-gray-500 italic">
            {t("messages.loading")}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            ❌ {t("messages.error")}
          </div>
        )}

        {!isLoading && !error && halakhot.length > 0 && (
          <>
            {/* First chapter divider if there are multiple chapters */}
            {chapterBreaks.length > 0 && <ChapterDivider chapterNumber={1} />}

            {halakhot.map((halakha, index) => (
              <div key={index}>
                {/* Chapter divider before this halakha if needed */}
                {chapterBreaks.includes(index) && (
                  <ChapterDivider chapterNumber={halakha.chapter} />
                )}

                <HalakhaCard
                  halakha={halakha}
                  index={index}
                  date={date}
                  studyPath={studyPath}
                  textLanguage={textLanguage}
                  autoMarkPrevious={autoMarkPrevious}
                  onMarkComplete={handleMarkComplete}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </details>
  );
}
