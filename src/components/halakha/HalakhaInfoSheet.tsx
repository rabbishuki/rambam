"use client";

import { useState, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { ExternalLinks } from "./ExternalLinks";
import { BookmarkIcon } from "@/components/ui/icons/BookmarkIcon";
import { useAppStore, isHalakhaBookmarked } from "@/stores/appStore";
import {
  sefariaUrl,
  sefariaHalakhaUrl,
  chabadRambamUrl,
  chabadMitzvotUrl,
  textLanguageToSefariaLang,
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

  // Translation peek state
  const [showTranslation, setShowTranslation] = useState(false);

  // App state
  const textLanguage = useAppStore((state) => state.textLanguage);
  const bookmarks = useAppStore((state) => state.bookmarks);
  const addBookmark = useAppStore((state) => state.addBookmark);
  const removeBookmark = useAppStore((state) => state.removeBookmark);
  const updateBookmarkNote = useAppStore((state) => state.updateBookmarkNote);

  // Convert text language to Sefaria lang parameter
  const sefariaLang = textLanguageToSefariaLang(textLanguage);

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

  // Sefaria link - different logic for Sefer HaMitzvot vs Rambam
  // Sefer HaMitzvot: each halakha is a separate commandment with its own ref
  // Rambam: halakhot are within chapters, need to compute chapter:halakha
  const sefariaLink =
    studyPath === "mitzvot" && dayData.refs?.[halakhaIndex]
      ? `${sefariaUrl(dayData.refs[halakhaIndex])}?lang=${sefariaLang}`
      : sefariaHalakhaUrl(
          ref,
          halakhaIndex,
          dayData.chapterBreaks,
          sefariaLang,
        );

  // Chabad link (base URL, no text fragment)
  const chabadLink =
    studyPath === "mitzvot"
      ? chabadMitzvotUrl(date)
      : chabadRambamUrl(date, studyPath === "rambam1" ? 1 : 3);

  // Get the halakha text for the translation peek
  const halakhaText = dayData.texts?.[halakhaIndex];
  const canShowTranslation =
    textLanguage === "hebrew"
      ? !!halakhaText?.en
      : textLanguage === "english"
        ? !!halakhaText?.he
        : false;

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

  const handleSaveNote = () => {
    updateBookmarkNote(studyPath, date, halakhaIndex, noteText);
    setIsEditingNote(false);
  };

  const handleStartEditNote = () => {
    setNoteText(bookmark?.note || "");
    setIsEditingNote(true);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlay = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered floating card */}
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center px-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-xl shadow-2xl border-2 border-blue-200 overflow-hidden w-full max-w-md pointer-events-auto"
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-blue-800">
                {displayTitle}
              </h3>
              <p className="text-xs text-blue-600 mt-0.5">
                {t("halakha")} {halakhaIndex + 1}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-400 hover:text-blue-600 transition-colors p-1"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
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

          {/* Content */}
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
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
                  <button
                    onClick={handleStartEditNote}
                    className="text-sm text-gray-600 whitespace-pre-wrap text-start w-full hover:bg-gray-100 rounded p-1 -m-1 transition-colors"
                  >
                    {bookmark.note}
                  </button>
                ) : (
                  <button
                    onClick={handleStartEditNote}
                    className="text-sm text-gray-400 italic text-start w-full hover:bg-gray-100 rounded p-1 -m-1 transition-colors"
                  >
                    {tBookmarks("addNote")}...
                  </button>
                )}
              </div>
            )}

            {/* External links (with translate button when single-language) */}
            <ExternalLinks
              sefariaLink={sefariaLink}
              chabadLink={chabadLink}
              translateLabel={
                textLanguage === "hebrew"
                  ? t("showTranslation")
                  : textLanguage === "english"
                    ? t("showOriginal")
                    : undefined
              }
              onTranslate={
                textLanguage !== "both"
                  ? () => setShowTranslation(true)
                  : undefined
              }
            />

            {/* Reference */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">{ref}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const translationTitle =
    textLanguage === "hebrew" ? t("translationTitle") : t("originalTitle");

  const translationOverlay = showTranslation ? (
    <>
      {/* Translation backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[1000]"
        onClick={() => setShowTranslation(false)}
        aria-hidden="true"
      />

      {/* Translation dialog */}
      <div
        className="fixed inset-0 z-[1001] flex items-center justify-center px-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-xl shadow-2xl border-2 border-indigo-200 overflow-hidden w-full max-w-md pointer-events-auto"
          dir={textLanguage === "hebrew" ? "ltr" : "rtl"}
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-indigo-800">
              {translationTitle}
            </h3>
            <button
              onClick={() => setShowTranslation(false)}
              className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
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

          {/* Translation content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {canShowTranslation ? (
              // Trusted content from Sefaria API (same as HalakhaCard)
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    textLanguage === "hebrew"
                      ? halakhaText!.en!
                      : halakhaText!.he,
                }}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">
                {t("noTranslation")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  ) : null;

  if (typeof document !== "undefined") {
    return createPortal(
      <>
        {overlay}
        {translationOverlay}
      </>,
      document.body,
    );
  }

  return null;
}
