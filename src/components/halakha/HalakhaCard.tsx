"use client";

import { useCallback } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useAppStore, isHalakhaDone } from "@/stores/appStore";
import { toHebrewLetter } from "@/lib/hebrew";
import type { HalakhaText, TextLanguage, StudyPath } from "@/types";

interface HalakhaCardProps {
  halakha: HalakhaText;
  index: number;
  date: string;
  studyPath: StudyPath;
  textLanguage: TextLanguage;
  autoMarkPrevious: boolean;
  onMarkComplete?: (index: number) => void;
  onMarkIncomplete?: (index: number) => void;
}

export function HalakhaCard({
  halakha,
  index,
  date,
  studyPath,
  textLanguage,
  autoMarkPrevious,
  onMarkComplete,
  onMarkIncomplete,
}: HalakhaCardProps) {
  const done = useAppStore((state) => state.done);
  const markComplete = useAppStore((state) => state.markComplete);
  const markIncomplete = useAppStore((state) => state.markIncomplete);

  const isCompleted = isHalakhaDone(done, studyPath, date, index);
  const hebrewNum = toHebrewLetter(index + 1);

  const handleSwipeRight = useCallback(() => {
    if (!isCompleted) {
      markComplete(studyPath, date, index);

      // Auto-mark previous halakhot if enabled
      if (autoMarkPrevious && index > 0) {
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
    studyPath,
    date,
    index,
    autoMarkPrevious,
    done,
    onMarkComplete,
  ]);

  const handleSwipeLeft = useCallback(() => {
    if (isCompleted) {
      markIncomplete(studyPath, date, index);
      onMarkIncomplete?.(index);
    }
  }, [isCompleted, markIncomplete, studyPath, date, index, onMarkIncomplete]);

  const handleDoubleTap = useCallback(() => {
    if (isCompleted) {
      handleSwipeLeft();
    } else {
      handleSwipeRight();
    }
  }, [isCompleted, handleSwipeLeft, handleSwipeRight]);

  const { handlers, style } = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    onDoubleTap: handleDoubleTap,
    isCompleted,
  });

  // Determine what to show based on language setting
  const showHebrew = textLanguage === "hebrew" || textLanguage === "both";
  const showEnglish =
    (textLanguage === "english" || textLanguage === "both") && halakha.en;

  // Note: We use dangerouslySetInnerHTML here because Sefaria API returns
  // HTML-formatted text with bold tags, small tags, etc. This is trusted
  // content from the Sefaria API, not user-generated content.

  return (
    <div
      className={`
        bg-white border-2 rounded-xl p-4
        text-lg leading-relaxed
        relative cursor-grab active:cursor-grabbing
        shadow-sm hover:shadow-md
        touch-pan-y select-none
        transition-[box-shadow]
        ${
          isCompleted
            ? "opacity-40 bg-gray-100 border-gray-300"
            : "border-gray-200"
        }
      `}
      style={style}
      {...handlers}
      data-index={index}
    >
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
  );
}
