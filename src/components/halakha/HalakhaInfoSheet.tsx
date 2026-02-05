"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExternalLinks } from "./ExternalLinks";
import { BookmarkIcon } from "@/components/ui/icons/BookmarkIcon";
import { useAppStore, isHalakhaBookmarked } from "@/stores/appStore";
import {
  sefariaUrl,
  chabadRambamUrl,
  chabadMitzvotUrl,
} from "@/lib/externalLinks";
import type { DayData, StudyPath } from "@/types";

interface HalakhaInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: DayData;
  halakhaIndex: number;
  date: string;
  studyPath: StudyPath;
}

export function HalakhaInfoSheet({
  isOpen,
  onClose,
  dayData,
  halakhaIndex,
  date,
  studyPath,
}: HalakhaInfoSheetProps) {
  const locale = useLocale();
  const t = useTranslations("info");
  const tBookmarks = useTranslations("bookmarks");
  const isHebrew = locale === "he";

  // Bookmark state
  const bookmarks = useAppStore((state) => state.bookmarks);
  const addBookmark = useAppStore((state) => state.addBookmark);
  const removeBookmark = useAppStore((state) => state.removeBookmark);
  const updateBookmarkNote = useAppStore((state) => state.updateBookmarkNote);

  const isBookmarked = isHalakhaBookmarked(
    bookmarks,
    studyPath,
    date,
    halakhaIndex,
  );
  const bookmark = bookmarks[`${studyPath}:${date}:${halakhaIndex}`];

  // Note editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(bookmark?.note || "");

  // Get the display title
  const displayTitle = isHebrew ? dayData.he : dayData.en || dayData.he;

  // Get the reference for external links
  const ref = dayData.ref;

  // Sefaria and Chabad links based on study path
  const sefariaLink = sefariaUrl(ref);
  const chabadLink =
    studyPath === "mitzvot"
      ? chabadMitzvotUrl(date)
      : chabadRambamUrl(date, studyPath === "rambam1" ? 1 : 3);

  const handleToggleBookmark = useCallback(() => {
    if (isBookmarked) {
      removeBookmark(studyPath, date, halakhaIndex);
    } else {
      addBookmark(
        studyPath,
        date,
        halakhaIndex,
        dayData.he,
        dayData.en,
        dayData.ref,
      );
    }
  }, [
    isBookmarked,
    addBookmark,
    removeBookmark,
    studyPath,
    date,
    halakhaIndex,
    dayData,
  ]);

  const handleSaveNote = useCallback(() => {
    updateBookmarkNote(studyPath, date, halakhaIndex, noteText);
    setIsEditingNote(false);
  }, [updateBookmarkNote, studyPath, date, halakhaIndex, noteText]);

  const handleStartEditNote = useCallback(() => {
    setNoteText(bookmark?.note || "");
    setIsEditingNote(true);
  }, [bookmark?.note]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t("moreInfo")}>
      <div className="space-y-4" dir={isHebrew ? "rtl" : "ltr"}>
        {/* Chapter/Section title */}
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {displayTitle}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("halakha")} {halakhaIndex + 1}
          </p>
        </div>

        {/* Bookmark toggle */}
        <button
          onClick={handleToggleBookmark}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            isBookmarked
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
          }`}
        >
          <BookmarkIcon filled={isBookmarked} className="flex-shrink-0" />
          <span className="font-medium">
            {isBookmarked
              ? tBookmarks("removeBookmark")
              : tBookmarks("addBookmark")}
          </span>
        </button>

        {/* Note section - only show when bookmarked */}
        {isBookmarked && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {tBookmarks("personalNote")}
              </span>
              {!isEditingNote && (
                <button
                  onClick={handleStartEditNote}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {bookmark?.note
                    ? tBookmarks("editNote")
                    : tBookmarks("addNote")}
                </button>
              )}
            </div>

            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={tBookmarks("personalNote")}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNote}
                    className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    {tBookmarks("saveNote")}
                  </button>
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : bookmark?.note ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {bookmark.note}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                {tBookmarks("addNote")}...
              </p>
            )}
          </div>
        )}

        {/* External links */}
        <ExternalLinks sefariaLink={sefariaLink} chabadLink={chabadLink} />

        {/* Reference */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">{ref}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
