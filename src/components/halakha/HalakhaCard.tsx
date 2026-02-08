"use client";

import React, { useCallback, useState } from "react";
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
import type {
  HalakhaText,
  TextLanguage,
  StudyPath,
  DayData,
  CardStyle,
} from "@/types";

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

const HalakhaCardInner = React.memo(function HalakhaCard({
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

  // Narrow selectors: only re-render when THIS card's state changes
  const isCompleted = useAppStore((s) =>
    isHalakhaDone(s.done, studyPath, date, index),
  );
  const isBookmarked = useAppStore((s) =>
    isHalakhaBookmarked(s.bookmarks, studyPath, date, index),
  );

  // Actions are stable refs, don't need selectors
  const markComplete = useAppStore((state) => state.markComplete);
  const markIncomplete = useAppStore((state) => state.markIncomplete);
  const hasSeenAutoMarkPrompt = useAppStore(
    (state) => state.hasSeenAutoMarkPrompt,
  );
  const setAutoMarkPrevious = useAppStore((state) => state.setAutoMarkPrevious);
  const setHasSeenAutoMarkPrompt = useAppStore(
    (state) => state.setHasSeenAutoMarkPrompt,
  );

  const cardStyle = useAppStore((state) => state.cardStyle) as CardStyle;

  const [showPrompt, setShowPrompt] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const hebrewNum = toHebrewLetter(index + 1);

  // Narrow selector: count incomplete previous halakhot for this day/path only
  const incompletePreviousCount = useAppStore((s) => {
    if (index === 0) return 0;
    let count = 0;
    for (let i = 0; i < index; i++) {
      if (!isHalakhaDone(s.done, studyPath, date, i)) {
        count++;
      }
    }
    return count;
  });

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
        const currentDone = useAppStore.getState().done;
        for (let i = 0; i < index; i++) {
          if (!isHalakhaDone(currentDone, studyPath, date, i)) {
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
    onMarkComplete,
    onMarkIncomplete,
  ]);

  // Helper to mark this halakha and all previous incomplete ones
  const markThisAndPrevious = useCallback(() => {
    markComplete(studyPath, date, index);
    if (index > 0) {
      const currentDone = useAppStore.getState().done;
      for (let i = 0; i < index; i++) {
        if (!isHalakhaDone(currentDone, studyPath, date, i)) {
          markComplete(studyPath, date, i);
        }
      }
    }
    onMarkComplete?.(index);
  }, [markComplete, studyPath, date, index, onMarkComplete]);

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

  // Long press / right-click handler to open info sheet
  const handleLongPress = useCallback(() => {
    if (dayData) {
      setShowInfoSheet(true);
    }
  }, [dayData]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (dayData) {
        e.preventDefault();
        setShowInfoSheet(true);
      }
    },
    [dayData],
  );

  const { handlers, state, style } = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    onDoubleTap: handleDoubleTap,
    onLongPress: handleLongPress,
  });

  // Calculate swipe feedback visibility (0-1)
  const swipeProgress = Math.min(Math.abs(state.deltaX) / SWIPE_THRESHOLD, 1);
  const isOverThreshold = Math.abs(state.deltaX) >= SWIPE_THRESHOLD;

  // Determine what to show based on language setting (with fallback).
  // Decision: When English is requested but unavailable (Sefaria lacks translation
  // or the English fetch failed), we fall back to Hebrew rather than showing an
  // empty card. Hebrew text is almost always available since it's the primary source.
  // The DayGroup component shows a separate amber banner for the missing language.
  const wantsHebrew = textLanguage === "hebrew" || textLanguage === "both";
  const wantsEnglish = textLanguage === "english" || textLanguage === "both";
  const hasEnglish = !!halakha.en;
  const showHebrew = wantsHebrew || (wantsEnglish && !hasEnglish);
  const showEnglish = wantsEnglish && hasEnglish;

  // Note: We use dangerouslySetInnerHTML here because Sefaria API returns
  // HTML-formatted text with bold tags, small tags, etc. This is trusted
  // content from the Sefaria API, not user-generated content.

  const isList = cardStyle === "list";

  return (
    <div className={`relative ${isList ? "mx-0" : "mt-3 mx-2 sm:mx-0"}`}>
      {/* Swipe feedback overlays - positioned behind the card */}
      {state.isSwiping && (
        <>
          {/* RIGHT swipe feedback - shows on the LEFT side as card moves right */}
          {state.direction === "right" && (
            <div
              className={`
                absolute inset-y-0 left-0 ${isList ? "" : "rounded-xl"}
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
                absolute inset-y-0 right-0 ${isList ? "" : "rounded-xl"}
                flex items-center justify-center
                transition-colors duration-150
                ${
                  isOverThreshold
                    ? isCompleted
                      ? "bg-orange-500"
                      : "bg-[var(--color-primary)]"
                    : isCompleted
                      ? "bg-orange-200"
                      : "bg-[var(--color-primary)]/40"
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
          relative cursor-grab active:cursor-grabbing
          touch-pan-y select-none
          ${
            isList
              ? `border-b border-[var(--color-surface-border)] p-4 ${
                  isCompleted
                    ? "bg-[var(--color-completion-bg)]"
                    : "bg-transparent"
                }`
              : `bg-[var(--color-surface)] rounded-xl border border-[var(--color-surface-border)] ${
                  isCompleted
                    ? "bg-[var(--color-completion-bg)] border-[var(--color-completion-border)]"
                    : ""
                }`
          }
          ${isCompleted ? "opacity-60" : ""}
        `}
        style={style}
        {...handlers}
        onContextMenu={handleContextMenu}
        data-index={index}
      >
        {/* Card content: inline number + text */}
        <div
          className={`flex items-start gap-2 ${isList ? "" : "p-4"}`}
          dir={textLanguage === "english" ? "ltr" : "rtl"}
        >
          {/* Number indicator + info icon */}
          <div className="flex flex-col items-center flex-shrink-0 mt-1 gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (dayData) setShowInfoSheet(true);
              }}
              className={`
                text-base font-bold leading-none
                ${
                  isCompleted
                    ? "text-[var(--color-completion-accent)]"
                    : "text-[var(--color-primary)]"
                }
              `}
              aria-label={dayData ? "More information" : undefined}
            >
              {textLanguage === "english" ? String(index + 1) : hebrewNum}
            </button>
            {/* ⓘ icon - visible when info sheet is available and card not completed */}
            {dayData && !isCompleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoSheet(true);
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                aria-label="More information"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            )}
            {/* Bookmark indicator - inline under number/info */}
            {isBookmarked && (
              <svg
                className="w-4 h-4 text-amber-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                aria-label="Bookmarked"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div
              className={`
                ${textLanguage === "both" ? "flex flex-col sm:flex-row" : ""}
              `}
            >
              {/* Hebrew text - trusted content from Sefaria API */}
              {showHebrew && (
                <div
                  className={`
                    text-lg leading-relaxed text-justify
                    ${isCompleted ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}
                    ${textLanguage === "both" ? "sm:flex-1 sm:pl-4" : ""}
                  `}
                  dir="rtl"
                  dangerouslySetInnerHTML={{ __html: halakha.he }}
                />
              )}

              {/* Separator - only in both mode on wide screens */}
              {textLanguage === "both" && showHebrew && showEnglish && (
                <div className="hidden sm:block w-px bg-[var(--color-surface-border)] mx-2" />
              )}

              {/* English text - trusted content from Sefaria API */}
              {showEnglish && (
                <div
                  className={`
                    text-base leading-relaxed text-justify
                    ${isCompleted ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-text-secondary)]"}
                    ${textLanguage === "both" ? "sm:flex-1 sm:pr-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--color-surface-border)]" : ""}
                  `}
                  dir="ltr"
                  dangerouslySetInnerHTML={{ __html: halakha.en || "" }}
                />
              )}
            </div>
          </div>
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
});

export { HalakhaCardInner as HalakhaCard };
