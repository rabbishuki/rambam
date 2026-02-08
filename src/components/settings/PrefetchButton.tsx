"use client";

import { useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { useLocationStore } from "@/stores/locationStore";
import { getJewishDate, formatDateString } from "@/lib/dates";
import { canPrefetch, type PrefetchProgress } from "@/services/prefetch";
import { fetchCalendar, fetchHalakhot } from "@/services/sefaria";
import type { StudyPath } from "@/types";

const HE_DOW = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const EN_DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Shows which upcoming dates have been downloaded for offline use.
 * Each pill shows the day-of-week and Hebrew date (or Gregorian fallback).
 * Includes a force-download button for missing dates.
 */
export function PrefetchButton() {
  const t = useTranslations("offline");
  const locale = useLocale();
  const isHebrew = locale === "he";
  const daysAhead = useAppStore((state) => state.daysAhead);
  const rawActivePaths = useAppStore((state) => state.activePaths);
  const activePaths = useMemo(
    () => rawActivePaths ?? ["rambam3"],
    [rawActivePaths],
  );
  const days = useAppStore((state) => state.days);
  const sunset = useLocationStore((state) => state.sunset);

  const today = useMemo(() => getJewishDate(sunset), [sunset]);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);

  // Build list of upcoming dates and their download status
  const dateStatuses = useMemo(() => {
    const statuses: Array<{
      date: string;
      dow: string;
      hebrewLabel: string;
      downloaded: boolean;
    }> = [];

    const startDate = new Date(
      parseInt(today.slice(0, 4)),
      parseInt(today.slice(5, 7)) - 1,
      parseInt(today.slice(8, 10)),
    );

    for (let i = 0; i <= daysAhead; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateString(d);

      // A date is "downloaded" if ALL active paths have text content for it.
      // Checking texts (not just metadata) ensures pills turn gray after cache clear,
      // since partialize strips texts from localStorage and clearTextsFromDays strips
      // them from memory.
      const downloaded = activePaths.every((path) => {
        const dayData = days[path]?.[dateStr];
        return dayData?.texts != null && dayData.texts.length > 0;
      });

      // Day of week
      const dow = isHebrew ? HE_DOW[d.getDay()] : EN_DOW[d.getDay()];

      // Hebrew date label: pull from stored data if available
      let hebrewLabel = "";
      if (downloaded) {
        // Find Hebrew date from any active path's data
        for (const path of activePaths) {
          const dayData = days[path]?.[dateStr];
          if (dayData) {
            hebrewLabel = isHebrew
              ? (dayData.heDate ?? "")
              : (dayData.enDate ?? "");
            break;
          }
        }
      }
      // Fallback to Gregorian if no Hebrew date
      if (!hebrewLabel) {
        hebrewLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      }

      statuses.push({ date: dateStr, dow, hebrewLabel, downloaded });
    }

    return statuses;
  }, [today, daysAhead, activePaths, days, isHebrew]);

  const downloadedCount = dateStatuses.filter((s) => s.downloaded).length;
  const totalCount = dateStatuses.length;
  const allDownloaded = downloadedCount === totalCount;

  const setDayData = useAppStore((state) => state.setDayData);

  // Force download handler — fetches data AND updates Zustand store
  const handleDownload = useCallback(async () => {
    if (!(await canPrefetch()) || downloading) return;

    setDownloading(true);
    setProgress(null);

    const totalItems = (daysAhead + 1) * activePaths.length;
    let completed = 0;
    let failed = 0;

    try {
      for (const path of activePaths as StudyPath[]) {
        const startDate = new Date(
          parseInt(today.slice(0, 4)),
          parseInt(today.slice(5, 7)) - 1,
          parseInt(today.slice(8, 10)),
        );

        for (let i = 0; i <= daysAhead; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = formatDateString(d);

          setProgress({
            total: totalItems,
            completed,
            failed,
            currentDate: dateStr,
            status: "prefetching",
          });

          try {
            const calData = await fetchCalendar(dateStr, path);
            const { halakhot, chapterBreaks } = await fetchHalakhot(
              calData.ref,
            );

            // Update Zustand store so pills turn green
            setDayData(path, dateStr, {
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

            completed++;
          } catch (error) {
            console.error(`Prefetch failed for ${path}/${dateStr}:`, error);
            failed++;
          }
        }
      }
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }, [today, activePaths, daysAhead, downloading, setDayData]);

  const progressPercent = progress
    ? Math.round(
        ((progress.completed + progress.failed) / progress.total) * 100,
      )
    : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>{t("downloadedStatus")}</span>
        <span className="font-medium text-[var(--color-text-secondary)]">
          {downloadedCount}/{totalCount}
        </span>
      </div>

      {/* Date pills */}
      <div className="flex flex-wrap gap-1.5" dir={isHebrew ? "rtl" : "ltr"}>
        {dateStatuses.map((s) => (
          <div
            key={s.date}
            className={`flex flex-col items-center px-1.5 py-1 rounded min-w-[3rem] ${
              s.downloaded
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <span className="text-[9px] font-medium leading-tight opacity-70">
              {s.dow}
            </span>
            <span className="text-[11px] font-semibold leading-tight">
              {s.hebrewLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Download button + progress */}
      {!allDownloaded && (
        <div className="space-y-1.5">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-2 rounded-lg text-sm font-medium border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 active:bg-[var(--color-primary)]/20 disabled:opacity-50 transition-colors"
          >
            {downloading
              ? t("downloading", { percent: progressPercent })
              : t("downloadNow")}
          </button>
          {downloading && progress && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
          {!downloading && (
            <p className="text-[11px] text-[var(--color-text-muted)] text-center">
              {t("autoDownloadHint")}
            </p>
          )}
        </div>
      )}

      {allDownloaded && (
        <p className="text-[11px] text-green-600 text-center font-medium">
          {t("allDownloaded")}
        </p>
      )}
    </div>
  );
}
