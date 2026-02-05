"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { BookmarkIcon } from "@/components/ui/icons/BookmarkIcon";
import type { Bookmark } from "@/types";

interface BookmarkItemProps {
  bookmark: Bookmark;
}

export function BookmarkItem({ bookmark }: BookmarkItemProps) {
  const locale = useLocale();
  const t = useTranslations("bookmarks");
  const isHebrew = locale === "he";

  const removeBookmark = useAppStore((state) => state.removeBookmark);

  // Format display title based on locale
  const displayTitle = isHebrew
    ? bookmark.titleHe
    : bookmark.titleEn || bookmark.titleHe;

  // Format date for display
  const formattedDate = new Date(bookmark.date).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removeBookmark(bookmark.path, bookmark.date, bookmark.index);
    },
    [removeBookmark, bookmark],
  );

  // Path labels
  const pathLabels: Record<string, { he: string; en: string }> = {
    rambam3: { he: "ג׳ פרקים", en: "3 Ch." },
    rambam1: { he: "פרק אחד", en: "1 Ch." },
    mitzvot: { he: "מצוות", en: "Mitzvot" },
  };
  const pathLabel = isHebrew
    ? pathLabels[bookmark.path]?.he
    : pathLabels[bookmark.path]?.en;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <BookmarkIcon filled className="text-amber-500 flex-shrink-0 mt-1" />

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{displayTitle}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">
              {pathLabel}
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
            <span>•</span>
            <span>#{bookmark.index + 1}</span>
          </div>

          {bookmark.note && (
            <p className="mt-2 text-sm text-gray-600 bg-amber-50 p-2 rounded border-l-2 border-amber-300">
              {bookmark.note}
            </p>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title={t("removeBookmark")}
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
