"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { ShareButton } from "@/components/sharing/ShareButton";
import type { DaySummary } from "@/types";

interface SummaryItemProps {
  summary: DaySummary;
}

export function SummaryItem({ summary }: SummaryItemProps) {
  const locale = useLocale();
  const t = useTranslations("summary");
  const isHebrew = locale === "he";

  const tDates = useTranslations("dates");
  const deleteSummary = useAppStore((state) => state.deleteSummary);
  const days = useAppStore((state) => state.days);

  // Get day data for Hebrew date display
  const dayData = days[summary.path]?.[summary.date];
  const hebrewDateDisplay = isHebrew ? dayData?.heDate : dayData?.enDate;

  // Relative date label
  const relativeDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const summaryDate = new Date(summary.date + "T00:00:00");
    const diffDays = Math.round(
      (today.getTime() - summaryDate.getTime()) / 86400000,
    );

    if (diffDays === 0) return tDates("today");
    if (diffDays === 1) return tDates("yesterday");
    return tDates("daysAgo", { count: diffDays });
  })();

  // Path labels
  const pathLabels: Record<string, { he: string; en: string }> = {
    rambam3: { he: "ג׳ פרקים", en: "3 Ch." },
    rambam1: { he: "פרק אחד", en: "1 Ch." },
    mitzvot: { he: "מצוות", en: "Mitzvot" },
  };
  const pathLabel = isHebrew
    ? pathLabels[summary.path]?.he
    : pathLabels[summary.path]?.en;

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteSummary(summary.path, summary.date);
    },
    [deleteSummary, summary],
  );

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-3 hover:bg-[var(--color-surface-hover)] transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">💭</span>

        <div className="flex-1 min-w-0">
          {/* Path badge + date */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded font-medium">
              {pathLabel}
            </span>
            <span>•</span>
            <span>{relativeDate}</span>
            {hebrewDateDisplay && (
              <>
                <span>•</span>
                <span>{hebrewDateDisplay}</span>
              </>
            )}
          </div>

          {/* Summary text */}
          <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {summary.text}
          </p>

          {/* Actions row */}
          <div className="mt-2 flex items-center gap-2">
            <ShareButton
              path={summary.path}
              date={summary.date}
              summaryText={summary.text}
              dayTitle={isHebrew ? dayData?.he : dayData?.en || dayData?.he}
            />
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
          title={t("delete")}
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
        </button>
      </div>
    </div>
  );
}
