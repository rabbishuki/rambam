"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { ShareButton } from "@/components/sharing/ShareButton";
import type { StudyPath } from "@/types";

interface DaySummaryEditorProps {
  path: StudyPath;
  date: string;
  isComplete?: boolean;
  dayTitle?: string;
}

export function DaySummaryEditor({
  path,
  date,
  isComplete = false,
  dayTitle,
}: DaySummaryEditorProps) {
  const locale = useLocale();
  const t = useTranslations("summary");
  const isHebrew = locale === "he";

  const summaries = useAppStore((state) => state.summaries);
  const saveSummary = useAppStore((state) => state.saveSummary);

  const summaryKey = `${path}:${date}`;
  const existingSummary = summaries[summaryKey];

  // Track last known saved text to detect external changes
  const lastSavedTextRef = useRef(existingSummary?.text || "");

  // Reset local state if external summary changed (e.g., from another tab)
  const savedText = existingSummary?.text || "";
  if (lastSavedTextRef.current !== savedText) {
    lastSavedTextRef.current = savedText;
  }

  const [isExpanded, setIsExpanded] = useState(!!existingSummary?.text);
  const [text, setText] = useState(existingSummary?.text || "");

  // Derive isSaved from comparing current text with saved text
  const isSaved = text === savedText;

  const handleSave = useCallback(() => {
    if (text.trim()) {
      saveSummary(path, date, text.trim());
      // Update ref to track this as the new saved state
      lastSavedTextRef.current = text.trim();
    }
  }, [saveSummary, path, date, text]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Auto-save on blur if there are changes
  const handleBlur = useCallback(() => {
    if (!isSaved && text.trim()) {
      handleSave();
    }
  }, [isSaved, text, handleSave]);

  return (
    <div
      className="mt-4 border-t border-dashed border-[var(--color-surface-border)] pt-4"
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {/* Collapsed header */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between p-3 bg-[var(--color-primary)]/8 rounded-lg hover:bg-[var(--color-primary)]/12 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">💭</span>
          <span className="font-medium text-[var(--color-primary-dark)]">
            {t("title")}
          </span>
          {existingSummary?.text && !isExpanded && (
            <span className="text-xs text-[var(--color-primary)] opacity-60 truncate max-w-[150px]">
              — {existingSummary.text.slice(0, 50)}
              {existingSummary.text.length > 50 ? "..." : ""}
            </span>
          )}
        </div>
        <span
          className={`text-[var(--color-primary)] opacity-50 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            placeholder={t("placeholder")}
            className="w-full p-3 border border-[var(--color-surface-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] min-h-[100px] bg-[var(--color-surface)]"
            rows={4}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={isSaved || !text.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSaved || !text.trim()
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-not-allowed"
                    : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                }`}
              >
                {isSaved ? "✓" : t("save")}
              </button>

              {/* Share button - only show if there's saved text */}
              {existingSummary?.text && (
                <ShareButton
                  path={path}
                  date={date}
                  summaryText={existingSummary.text}
                  dayTitle={dayTitle}
                />
              )}
            </div>

            {/* Completion status hint */}
            {!isComplete && (
              <span className="text-xs text-gray-400 italic">{t("empty")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
