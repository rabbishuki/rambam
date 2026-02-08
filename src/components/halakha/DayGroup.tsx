"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useAppStore,
  countCompleted,
  isDayComplete,
  hasDayBookmarks,
} from "@/stores/appStore";
import { useHalakhaData } from "@/hooks/useHalakhaData";
import { useJewishDate } from "@/hooks/useJewishDate";
import { daysBetween } from "@/lib/dates";
import { HalakhaCard } from "./HalakhaCard";
import { ChapterDivider } from "./ChapterDivider";
import { PathBadge } from "./PathBadge";
import { DaySummaryEditor } from "./DaySummaryEditor";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressCircle } from "@/components/ui/ProgressCircle";
import type { DayData, StudyPath, TextLanguage, CardStyle } from "@/types";

interface DayGroupProps {
  date: string;
  dayData: DayData;
  studyPath: StudyPath;
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
  defaultOpen?: boolean;
  onScrollToIncomplete?: () => void;
  showPathBadge?: boolean;
}

const DayGroupInner = React.memo(function DayGroup({
  date,
  dayData,
  studyPath,
  textLanguage,
  autoMarkPrevious,
  defaultOpen = false,
  onScrollToIncomplete,
  showPathBadge = false,
}: DayGroupProps) {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === "he";
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useJewishDate();

  // Narrow selectors: only re-render when THIS day's completion changes
  const doneCount = useAppStore((s) => countCompleted(s.done, studyPath, date));
  const isComplete = useAppStore((s) =>
    isDayComplete(s.done, studyPath, date, dayData.count),
  );
  const markAllComplete = useAppStore((state) => state.markAllComplete);
  const resetDay = useAppStore((state) => state.resetDay);
  const cardStyle = useAppStore((state) => state.cardStyle) as CardStyle;
  const hasBookmarks = useAppStore((s) =>
    hasDayBookmarks(s.bookmarks, studyPath, date),
  );
  const hasSummary = useAppStore((s) => !!s.summaries[`${studyPath}:${date}`]);
  const { confirm } = useConfirmDialog();

  const {
    halakhot,
    chapterBreaks,
    isLoading,
    error,
    refetch,
    languagesLoaded,
  } = useHalakhaData(
    isOpen ? dayData.ref : "",
    date,
    studyPath,
    isOpen ? dayData.refs : undefined, // Pass multiple refs for Sefer HaMitzvot
  );
  const pinDay = useAppStore((state) => state.pinDay);
  const pinnedDays = useAppStore((state) => state.pinnedDays);
  const isPinned = pinnedDays[`${studyPath}:${date}`] ?? false;
  const isToday = date === today;

  const completionPct =
    dayData.count > 0 ? Math.round((doneCount / dayData.count) * 100) : 0;

  // Compute relative date (e.g., "Yesterday", "2 days ago")
  const relativeDate = useMemo(() => {
    const days = daysBetween(date, today);
    if (days === 0) return t("dates.today");
    if (days === 1) return t("dates.yesterday");
    return t("dates.daysAgo", { count: days });
  }, [date, today, t]);

  // Get Hebrew calendar date in appropriate language
  const hebrewDate = useMemo(() => {
    if (isRTL) {
      return dayData.heDate || null;
    }
    // English mode: use English Hebrew date, never Hebrew script
    return dayData.enDate || null;
  }, [isRTL, dayData.heDate, dayData.enDate]);

  // Combine relative date with Hebrew calendar date
  // e.g., "Yesterday • 17 Sh'vat" or "2 days ago • 16 Sh'vat"
  const dateLabel = useMemo(() => {
    if (isToday) {
      return hebrewDate
        ? `${t("dates.today")} • ${hebrewDate}`
        : t("dates.today");
    }
    if (hebrewDate) {
      return `${relativeDate} • ${hebrewDate}`;
    }
    return relativeDate;
  }, [isToday, hebrewDate, relativeDate, t]);

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
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmed = await confirm({
        message: t("messages.confirmMarkAll", { title: displayTitle }),
      });
      if (confirmed) {
        markAllComplete(studyPath, date, dayData.count);
      }
    },
    [markAllComplete, studyPath, date, dayData.count, displayTitle, t, confirm],
  );

  const handleReset = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmed = await confirm({
        message: t("messages.confirmReset", { title: displayTitle }),
        variant: "danger",
      });
      if (confirmed) {
        resetDay(studyPath, date);
      }
    },
    [resetDay, studyPath, date, displayTitle, t, confirm],
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
      data-day-group={`${studyPath}:${date}`}
      className={`mb-4 sm:rounded-xl rounded-none bg-transparent sm:mx-0 -mx-0 ${isOpen ? "" : "overflow-hidden"}`}
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          handleToggle();
        }}
        className={`px-4 py-3 cursor-pointer select-none list-none rounded-xl flex items-center justify-between gap-3 ${
          isOpen
            ? `sticky z-10 shadow-sm bg-[var(--color-surface-hover)]`
            : "bg-[var(--color-primary)]/8 hover:bg-[var(--color-primary)]/12 active:bg-[var(--color-primary)]/16"
        } ${isComplete && !isOpen ? "opacity-60" : ""}`}
        style={
          isOpen
            ? {
                top: "var(--daygroup-sticky-top, 120px)",
                transition: "top 300ms ease",
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`text-[var(--color-primary)] transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            {arrow}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[var(--color-primary-dark)] truncate">
                {displayTitle}
              </span>
              {showPathBadge && <PathBadge path={studyPath} />}
              {hasBookmarks && (
                <svg
                  className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)] opacity-50"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>{t("bookmarks.title")}</title>
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {hasSummary && (
                <svg
                  className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)] opacity-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <title>{t("summary.title")}</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM19.5 7.125L16.862 4.487"
                  />
                </svg>
              )}
            </div>
            <div className="text-sm text-[var(--color-primary)] mt-0.5">
              {dateLabel} • {doneCount}/{dayData.count}
            </div>
          </div>
        </div>

        {/* Progress circle: 0% = empty, 1–99% = ring + %, 100% = filled + ✓ */}
        <div className="relative group">
          <button
            onClick={isComplete ? handleReset : handleCompleteAll}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-primary)]/10 active:bg-[var(--color-primary)]/20 shrink-0"
            aria-label={
              isComplete ? t("actions.reset") : t("actions.markComplete")
            }
          >
            <ProgressCircle percentage={completionPct} />
          </button>
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-full me-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-[var(--color-text-primary)] text-[var(--color-surface)] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {isComplete ? t("actions.reset") : t("actions.markComplete")}
          </span>
        </div>
      </summary>

      <div
        ref={containerRef}
        className={`flex flex-col ${cardStyle === "list" ? "px-0 pt-2 pb-4 gap-0" : "p-4 gap-3"}`}
      >
        {/* Skeleton loading — covers both isLoading and the initial blank frame */}
        {(isLoading || (halakhot.length === 0 && !error)) && (
          <div
            className={`${cardStyle === "list" ? "" : "space-y-3"}`}
            dir={textLanguage === "english" ? "ltr" : "rtl"}
          >
            {Array.from({ length: Math.min(dayData.count || 3, 5) }).map(
              (_, i) => (
                <div
                  key={i}
                  className={`animate-pulse ${
                    cardStyle === "list"
                      ? "border-b border-[var(--color-surface-border)] p-4"
                      : "bg-[var(--color-surface)] rounded-xl border border-[var(--color-surface-border)] p-4"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded bg-[var(--color-primary)]/15 shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--color-text-muted)]/15 rounded w-full" />
                      <div className="h-4 bg-[var(--color-text-muted)]/15 rounded w-5/6" />
                      <div className="h-4 bg-[var(--color-text-muted)]/15 rounded w-4/6" />
                      {textLanguage === "both" && (
                        <>
                          <div className="h-px bg-[var(--color-surface-border)] my-1" />
                          <div dir="ltr" className="space-y-2">
                            <div className="h-4 bg-[var(--color-text-muted)]/10 rounded w-full" />
                            <div className="h-4 bg-[var(--color-text-muted)]/10 rounded w-4/6" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8 px-4">
            {error?.toLowerCase().includes("offline") ||
            error?.toLowerCase().includes("failed to fetch") ||
            error?.toLowerCase().includes("network") ? (
              <div className="space-y-3">
                <div className="text-[var(--color-text-muted)]">
                  <svg
                    className="w-8 h-8 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12v.01M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072"
                    />
                    <line x1="4" y1="4" x2="20" y2="20" strokeWidth={2} />
                  </svg>
                  <p className="text-sm font-medium">
                    {t("offline.offlineContent")}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                  >
                    {t("offline.retryLoad")}
                  </button>
                  {!isPinned && (
                    <button
                      onClick={() => pinDay(studyPath, date)}
                      className="px-4 py-2 text-sm rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-surface-border)] hover:bg-[var(--color-surface-border)]"
                    >
                      {t("offline.downloadWhenOnline")}
                    </button>
                  )}
                </div>
                {isPinned && (
                  <p className="text-xs text-[var(--color-primary)]">
                    {t("offline.pinnedForDownload")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-red-500 text-sm">{t("messages.error")}</p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                >
                  {t("offline.retryLoad")}
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && halakhot.length > 0 && (
          <>
            {/* Language unavailable warning — shows when the requested language
                failed to fetch from Sefaria. Paired with HalakhaCard's fallback:
                cards silently show the available language, this banner explains why. */}
            {languagesLoaded &&
              ((textLanguage === "english" || textLanguage === "both") &&
              !languagesLoaded.en ? (
                <div className="mx-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-center">
                  {t("info.englishUnavailable")}
                </div>
              ) : (textLanguage === "hebrew" || textLanguage === "both") &&
                !languagesLoaded.he ? (
                <div className="mx-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 text-center">
                  {t("info.hebrewUnavailable")}
                </div>
              ) : null)}

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
                  dayData={dayData}
                />
              </div>
            ))}

            {/* Day summary editor - "What I Learned" */}
            <DaySummaryEditor
              path={studyPath}
              date={date}
              isComplete={isComplete}
              dayTitle={displayTitle}
            />
          </>
        )}
      </div>
    </details>
  );
});

export { DayGroupInner as DayGroup };
