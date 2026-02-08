"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useStats } from "@/hooks/useStats";
import { useLocationStore } from "@/stores/locationStore";
import { useAppStore, isHalakhaDone } from "@/stores/appStore";
import type { StudyPath, ContentWidth } from "@/types";

interface StatsBarProps {
  /** Optional selected date to show per-path breakdown */
  selectedDate?: string | null;
}

export function StatsBar({ selectedDate }: StatsBarProps = {}) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const isHebrew = locale === "he";
  const { completedDays, totalDays, todayPercent, backlog } = useStats();
  const hasCompletedSetup = useLocationStore(
    (state) => state.hasCompletedSetup,
  );

  // Get store data for per-path breakdown
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);
  const contentWidth = useAppStore((s) => s.contentWidth) as ContentWidth;
  // Scroll direction detection for hide/show behavior
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const statsBarRef = useRef<HTMLDivElement>(null);

  // Update CSS variable with StatsBar height for DayGroup sticky positioning
  // Changes when stats bar shows/hides or when layout changes
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (statsBarRef.current) {
        const statsHeight = statsBarRef.current.offsetHeight;
        // When visible: stick below stats bar
        // When hidden: stick below header only (60px)
        const stickyTop = isVisible ? 60 + statsHeight - 2 : 60;
        document.documentElement.style.setProperty(
          "--daygroup-sticky-top",
          `${stickyTop}px`,
        );
      }
    };
    requestAnimationFrame(updateHeight);
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [selectedDate, hasCompletedSetup, activePaths.length, isVisible]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

      // Only trigger if scroll delta is significant (> 10px)
      if (scrollDelta > 10) {
        if (scrollingDown && currentScrollY > 100) {
          setIsVisible(false);
        } else if (!scrollingDown) {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const surfaceBg = "bg-[var(--color-surface-hover)]";
  const baseClasses = `${surfaceBg} border-b-2 border-[var(--color-surface-border)] sticky top-[60px] z-[100] transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`;
  const widthClass =
    contentWidth === "narrow"
      ? "max-w-2xl"
      : contentWidth === "medium"
        ? "max-w-4xl"
        : "";
  const innerClasses = `px-4 py-3 flex justify-around gap-2 mx-auto ${widthClass}`;

  // Compute per-path completion for selected date
  const getPathCompletion = (path: StudyPath, date: string) => {
    const dayData = days[path]?.[date];
    if (!dayData || dayData.count === 0) return null;

    let doneCount = 0;
    for (let i = 0; i < dayData.count; i++) {
      if (isHalakhaDone(done, path, date, i)) {
        doneCount++;
      }
    }

    return {
      done: doneCount,
      total: dayData.count,
      percent: Math.round((doneCount / dayData.count) * 100),
      isComplete: doneCount >= dayData.count,
    };
  };

  // Get path display name
  const getPathName = (path: StudyPath): string => {
    const names: Record<StudyPath, { he: string; en: string }> = {
      rambam3: { he: "רמב״ם ג׳", en: "3 Chapters" },
      rambam1: { he: "רמב״ם א׳", en: "1 Chapter" },
      mitzvot: { he: "ס׳ המצוות", en: "Sefer HaMitzvot" },
    };
    return isHebrew ? names[path].he : names[path].en;
  };

  // Don't show stats until location is set up and we have data
  if (!hasCompletedSetup || totalDays === 0) {
    return (
      <div ref={statsBarRef} className={baseClasses}>
        <div className={innerClasses}>
          <div className="text-center flex-1">
            <span className="block text-2xl font-bold text-[var(--color-text-muted)]">
              —
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {t("completedDays")}
            </span>
          </div>

          <div className="text-center flex-1">
            <span className="block text-2xl font-bold text-[var(--color-text-muted)]">
              —
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {t("today")}
            </span>
          </div>

          <div className="text-center flex-1">
            <span className="block text-2xl font-bold text-[var(--color-text-muted)]">
              —
            </span>
            <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {t("backlog")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Per-path breakdown view when viewing a specific date
  if (selectedDate && activePaths.length > 0) {
    return (
      <div ref={statsBarRef} className={baseClasses}>
        <div
          className={`px-4 py-2 flex flex-wrap justify-center gap-3 mx-auto ${widthClass}`}
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {activePaths.map((path) => {
            const completion = getPathCompletion(path, selectedDate);
            if (!completion) return null;

            return (
              <div
                key={path}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  completion.isComplete
                    ? "bg-green-100 text-green-800"
                    : completion.percent > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className="font-medium">{getPathName(path)}:</span>
                <span>
                  {completion.done}/{completion.total}
                </span>
                {completion.isComplete ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-xs">({completion.percent}%)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default stats view
  return (
    <div ref={statsBarRef} className={baseClasses}>
      <div className={innerClasses}>
        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-[var(--color-primary)]">
            {completedDays}/{totalDays}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {t("completedDays")}
          </span>
        </div>

        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-[var(--color-primary)]">
            {todayPercent}%
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {t("today")}
          </span>
        </div>

        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-[var(--color-primary)]">
            {backlog}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {t("backlog")}
          </span>
        </div>
      </div>
    </div>
  );
}
