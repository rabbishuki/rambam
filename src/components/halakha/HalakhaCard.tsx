"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import {
  useAppStore,
  isHalakhaDone,
  isHalakhaBookmarked,
} from "@/stores/appStore";
import { toHebrewLetter } from "@/lib/hebrew";
import { AutoMarkPrompt, type AutoMarkChoice } from "./AutoMarkPrompt";
import { HalakhaInfoSheet } from "./HalakhaInfoSheet";
import type { HalakhaText, TextLanguage, StudyPath, DayData } from "@/types";

interface HalakhaCardProps {
  halakha: HalakhaText;
  index: number;
  date: string;
  studyPath: StudyPath;
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
  onMarkComplete?: (index: number) => void;
  onMarkIncomplete?: (index: number) => void;
  dayData?: DayData;
}

// Swipe threshold to trigger action (in pixels)
const SWIPE_THRESHOLD = 100;

export function HalakhaCard({
  halakha,
  index,
  date,
  studyPath,
  textLanguage,
  autoMarkPrevious,
  onMarkComplete,
  onMarkIncomplete,
  dayData,
}: HalakhaCardProps) {
  const t = useTranslations("swipe");
  const done = useAppStore((state) => state.done);
  const bookmarks = useAppStore((state) => state.bookmarks);
  const markComplete = useAppStore((state) => state.markComplete);
  const markIncomplete = useAppStore((state) => state.markIncomplete);
  const hasSeenAutoMarkPrompt = useAppStore(
    (state) => state.hasSeenAutoMarkPrompt,
  );
  const setAutoMarkPrevious = useAppStore((state) => state.setAutoMarkPrevious);
  const setHasSeenAutoMarkPrompt = useAppStore(
    (state) => state.setHasSeenAutoMarkPrompt,
  );

  const [showPrompt, setShowPrompt] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const isCompleted = isHalakhaDone(done, studyPath, date, index);
  const isBookmarked = isHalakhaBookmarked(bookmarks, studyPath, date, index);
  const hebrewNum = toHebrewLetter(index + 1);

  // Count how many previous halakhot are incomplete (for "mark all previous" display)
  const incompletePreviousCount = useMemo(() => {
    if (index === 0) return 0;
    let count = 0;
    for (let i = 0; i < index; i++) {
      if (!isHalakhaDone(done, studyPath, date, i)) {
        count++;
      }
    }
    return count;
  }, [index, done, studyPath, date]);

  // Swipe RIGHT: Mark only this one as read, OR mark as unread if already read
  const handleSwipeRight = useCallback(() => {
    if (isCompleted) {
      // Already read → mark as unread
      markIncomplete(studyPath, date, index);
      onMarkIncomplete?.(index);
    } else {
      // Not read → mark only this one as read
      markComplete(studyPath, date, index);
      onMarkComplete?.(index);
    }
  }, [
    isCompleted,
    markComplete,
    markIncomplete,
    studyPath,
    date,
    index,
    onMarkComplete,
    onMarkIncomplete,
  ]);

  // Swipe LEFT: Mark this + all previous as read, OR mark as unread if already read
  const handleSwipeLeft = useCallback(() => {
    if (isCompleted) {
      // Already read → mark as unread
      markIncomplete(studyPath, date, index);
      onMarkIncomplete?.(index);
    } else {
      // Not read → mark this + all previous as read
      markComplete(studyPath, date, index);
      if (index > 0) {
        for (let i = 0; i < index; i++) {
          if (!isHalakhaDone(done, studyPath, date, i)) {
            markComplete(studyPath, date, i);
          }
        }
      }
      onMarkComplete?.(index);
    }
  }, [
    isCompleted,
    markComplete,
    markIncomplete,
    studyPath,
    date,
    index,
    done,
    onMarkComplete,
    onMarkIncomplete,
  ]);

  // Helper to mark this halakha and all previous incomplete ones
  const markThisAndPrevious = useCallback(() => {
    markComplete(studyPath, date, index);
    if (index > 0) {
      for (let i = 0; i < index; i++) {
        if (!isHalakhaDone(done, studyPath, date, i)) {
          markComplete(studyPath, date, i);
        }
      }
    }
    onMarkComplete?.(index);
  }, [markComplete, studyPath, date, index, done, onMarkComplete]);

  // Helper to mark only this halakha
  const markOnlyThis = useCallback(() => {
    markComplete(studyPath, date, index);
    onMarkComplete?.(index);
  }, [markComplete, studyPath, date, index, onMarkComplete]);

  // Handle user's choice from the auto-mark prompt
  const handlePromptChoice = useCallback(
    (choice: AutoMarkChoice) => {
      setShowPrompt(false);

      switch (choice) {
        case "always":
          // Enable auto-mark setting and mark all
          setAutoMarkPrevious(true);
          setHasSeenAutoMarkPrompt(true);
          markThisAndPrevious();
          break;
        case "justOnce":
          // Mark all but don't change setting
          setHasSeenAutoMarkPrompt(true);
          markThisAndPrevious();
          break;
        case "onlyThis":
          // Mark only current, remember user's choice
          setHasSeenAutoMarkPrompt(true);
          markOnlyThis();
          break;
        case "cancel":
          // Do nothing
          break;
      }
    },
    [
      setAutoMarkPrevious,
      setHasSeenAutoMarkPrompt,
      markThisAndPrevious,
      markOnlyThis,
    ],
  );

  // Double-tap: respects autoMarkPrevious setting, shows prompt on first multi-mark
  const handleDoubleTap = useCallback(() => {
    if (isCompleted) {
      // Toggle off - just mark as unread
      markIncomplete(studyPath, date, index);
      onMarkIncomplete?.(index);
    } else {
      // Check if there are incomplete previous halakhot
      const hasIncompletePrevious = incompletePreviousCount > 0;

      if (!hasIncompletePrevious) {
        // No previous incomplete, just mark this one
        markOnlyThis();
      } else if (autoMarkPrevious) {
        // Auto-mark is enabled, mark all
        markThisAndPrevious();
      } else if (!hasSeenAutoMarkPrompt) {
        // First time with incomplete previous - show prompt
        setShowPrompt(true);
      } else {
        // User has seen prompt before and chose not to auto-mark, just mark this one
        markOnlyThis();
      }
    }
  }, [
    isCompleted,
    markIncomplete,
    studyPath,
    date,
    index,
    onMarkIncomplete,
    incompletePreviousCount,
    autoMarkPrevious,
    hasSeenAutoMarkPrompt,
    markOnlyThis,
    markThisAndPrevious,
  ]);

  // Long press handler to open info sheet
  const handleLongPress = useCallback(() => {
    if (dayData) {
      setShowInfoSheet(true);
    }
  }, [dayData]);

  const { handlers, state, style } = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    onDoubleTap: handleDoubleTap,
    onLongPress: handleLongPress,
  });

  // Calculate swipe feedback visibility (0-1)
  const swipeProgress = Math.min(Math.abs(state.deltaX) / SWIPE_THRESHOLD, 1);
  const isOverThreshold = Math.abs(state.deltaX) >= SWIPE_THRESHOLD;

  // Determine what to show based on language setting
  const showHebrew = textLanguage === "hebrew" || textLanguage === "both";
  const showEnglish =
    (textLanguage === "english" || textLanguage === "both") && halakha.en;

  // Note: We use dangerouslySetInnerHTML here because Sefaria API returns
  // HTML-formatted text with bold tags, small tags, etc. This is trusted
  // content from the Sefaria API, not user-generated content.

  return (
    <div className="relative">
      {/* Swipe feedback overlays - positioned behind the card */}
      {state.isSwiping && (
        <>
          {/* RIGHT swipe feedback - shows on the LEFT side as card moves right */}
          {state.direction === "right" && (
            <div
              className={`
                absolute inset-y-0 left-0 sm:rounded-xl rounded-none
                flex items-center justify-center
                transition-colors duration-150
                ${
                  isOverThreshold
                    ? isCompleted
                      ? "bg-orange-500"
                      : "bg-green-500"
                    : isCompleted
                      ? "bg-orange-200"
                      : "bg-green-200"
                }
              `}
              style={{
                width: Math.abs(state.deltaX),
                opacity: swipeProgress * 0.9 + 0.1,
              }}
            >
              <div
                className="flex flex-col items-center gap-1 text-white px-3"
                dir="rtl"
              >
                <span
                  className={`text-2xl ${isOverThreshold ? "scale-125" : ""} transition-transform`}
                >
                  {isCompleted ? "↩" : "✓"}
                </span>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${swipeProgress > 0.5 ? "opacity-100" : "opacity-0"} transition-opacity`}
                >
                  {isCompleted ? t("markUnread") : t("markRead")}
                </span>
              </div>
            </div>
          )}

          {/* LEFT swipe feedback - shows on the RIGHT side as card moves left */}
          {state.direction === "left" && (
            <div
              className={`
                absolute inset-y-0 right-0 sm:rounded-xl rounded-none
                flex items-center justify-center
                transition-colors duration-150
                ${
                  isOverThreshold
                    ? isCompleted
                      ? "bg-orange-500"
                      : "bg-blue-500"
                    : isCompleted
                      ? "bg-orange-200"
                      : "bg-blue-200"
                }
              `}
              style={{
                width: Math.abs(state.deltaX),
                opacity: swipeProgress * 0.9 + 0.1,
              }}
            >
              <div
                className="flex flex-col items-center gap-1 text-white px-3"
                dir="rtl"
              >
                <span
                  className={`text-2xl ${isOverThreshold ? "scale-125" : ""} transition-transform`}
                >
                  {isCompleted ? "↩" : "✓✓"}
                </span>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${swipeProgress > 0.5 ? "opacity-100" : "opacity-0"} transition-opacity`}
                >
                  {isCompleted
                    ? t("markUnread")
                    : t("markAllPrevious", {
                        count: incompletePreviousCount + 1,
                      })}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* The actual card */}
      <div
        className={`
          bg-white border-2 sm:rounded-xl rounded-none p-4
          text-lg leading-relaxed
          relative cursor-grab active:cursor-grabbing
          shadow-sm hover:shadow-md
          touch-pan-y select-none
          transition-[box-shadow]
          sm:border-2 border-y-2 border-x-0
          ${
            isCompleted
              ? "opacity-50 bg-green-50 border-green-200"
              : "border-gray-200"
          }
        `}
        style={style}
        {...handlers}
        data-index={index}
      >
        {/* Info icon - opens info sheet, positioned on left corner */}
        {dayData && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoSheet(true);
            }}
            className="absolute top-2 left-2 sm:-top-2 sm:-left-2
                       w-6 h-6 text-gray-400 hover:text-gray-600 bg-white border border-gray-200
                       flex items-center justify-center rounded-full hover:bg-gray-100
                       transition-colors z-10 shadow-sm"
            aria-label="More information"
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        {/* Bookmark indicator - positioned on right corner */}
        {isBookmarked && (
          <div
            className="absolute top-2 right-2 sm:-top-2 sm:-right-2
                       w-6 h-6 text-amber-500 bg-white border border-amber-200
                       flex items-center justify-center rounded-full shadow-sm z-10"
            aria-label="Bookmarked"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}

        {/* Bilingual layout: side-by-side on wide (Hebrew RIGHT, English LEFT), stacked on narrow */}
        <div
          className={`
        ${textLanguage === "both" ? "flex flex-col sm:flex-row-reverse" : ""}
      `}
        >
          {/* Hebrew text - always on the right in bilingual mode */}
          {showHebrew && (
            <div
              className={`
              ${isCompleted ? "line-through text-gray-500" : "text-gray-800"}
              ${textLanguage === "both" ? "sm:flex-1 sm:pl-4" : ""}
              text-justify
            `}
              dir="rtl"
            >
              <span className="font-bold text-gray-900">{hebrewNum}.</span>{" "}
              {/* Trusted content from Sefaria API */}
              <span dangerouslySetInnerHTML={{ __html: halakha.he }} />
            </div>
          )}

          {/* Separator - only in both mode on wide screens */}
          {textLanguage === "both" && showHebrew && showEnglish && (
            <div className="hidden sm:block w-px bg-gray-300 mx-2" />
          )}

          {/* English text - always on the left in bilingual mode */}
          {showEnglish && (
            <div
              className={`
              ${isCompleted ? "line-through text-gray-500" : "text-gray-700"}
              ${textLanguage === "both" ? "sm:flex-1 sm:pr-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200" : ""}
              text-justify text-base
            `}
              dir="ltr"
            >
              {textLanguage === "english" && (
                <span className="font-bold">{index + 1}.</span>
              )}{" "}
              {/* Trusted content from Sefaria API */}
              <span dangerouslySetInnerHTML={{ __html: halakha.en || "" }} />
            </div>
          )}
        </div>
      </div>

      {/* Auto-mark prompt dialog */}
      <AutoMarkPrompt
        isOpen={showPrompt}
        count={incompletePreviousCount}
        onChoice={handlePromptChoice}
      />

      {/* Info sheet with external links */}
      {dayData && (
        <HalakhaInfoSheet
          isOpen={showInfoSheet}
          onClose={() => setShowInfoSheet(false)}
          dayData={dayData}
          halakhaIndex={index}
          date={date}
          studyPath={studyPath}
        />
      )}
    </div>
  );
}
