"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import {
  findFirstIncomplete,
  getHalakhaCardId,
} from "@/hooks/useFirstIncomplete";
import type { StudyPath, DayData } from "@/types";

interface ScrollToIncompleteFABProps {
  activePaths: StudyPath[];
  days: Record<StudyPath, Record<string, DayData>>;
  sortedDates: string[];
}

export function ScrollToIncompleteFAB({
  activePaths,
  days,
  sortedDates,
}: ScrollToIncompleteFABProps) {
  const t = useTranslations("scroll");
  const done = useAppStore((state) => state.done);

  const firstIncomplete = findFirstIncomplete(
    activePaths,
    days,
    done,
    sortedDates,
  );

  const handleClick = useCallback(() => {
    if (!firstIncomplete.date || !firstIncomplete.path) return;

    // First, try to find and expand the DayGroup if it's collapsed
    const dayGroupKey = `${firstIncomplete.path}:${firstIncomplete.date}`;
    const dayGroupElement = document.querySelector(
      `[data-day-group="${dayGroupKey}"]`,
    );

    if (dayGroupElement) {
      // If it's a details element and it's closed, open it
      const details = dayGroupElement.closest("details");
      if (details && !details.open) {
        details.open = true;
      }
    }

    // Wait a bit for the DOM to update if we opened a collapsed section
    setTimeout(() => {
      // Try to find the card by data-index attribute within the day group
      const cardSelector = `[data-day-group="${dayGroupKey}"] [data-index="${firstIncomplete.index}"]`;
      let cardElement = document.querySelector(cardSelector);

      // Fallback: try finding by the generated ID
      if (!cardElement && firstIncomplete.index !== null) {
        const cardId = getHalakhaCardId(
          firstIncomplete.path!,
          firstIncomplete.date!,
          firstIncomplete.index,
        );
        cardElement = document.getElementById(cardId);
      }

      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add a brief highlight effect
        cardElement.classList.add("ring-4", "ring-blue-400", "ring-opacity-75");
        setTimeout(() => {
          cardElement?.classList.remove(
            "ring-4",
            "ring-blue-400",
            "ring-opacity-75",
          );
        }, 1500);
      }
    }, 100);
  }, [firstIncomplete]);

  // Don't show FAB if there's nothing incomplete
  if (!firstIncomplete.date) {
    return null;
  }

  return (
    <button
      id="fab-button"
      onClick={handleClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:bg-blue-800 z-50 transition-all hover:scale-105 active:scale-95"
      title={t("jumpToNext")}
      aria-label={t("jumpToNext")}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}
