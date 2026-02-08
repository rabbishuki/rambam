/**
 * Tutorial Component
 *
 * Main component that renders the tutorial experience including
 * the overlay, demo cards, and highlight effects.
 *
 * Card state persists across stages 2-4 (swipe-right, swipe-left, mark-all)
 * to create a continuous practice flow.
 */

"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useIsClient } from "usehooks-ts";
import { useTranslations } from "next-intl";
import { useTutorial, TutorialAction } from "@/hooks/useTutorial";
import { TutorialOverlay } from "./TutorialOverlay";
import { DemoCard } from "./DemoCard";
import { ExternalLinks } from "@/components/halakha/ExternalLinks";
import { ProgressCircle } from "@/components/ui/ProgressCircle";

/**
 * Dynamic highlight that positions itself based on an element ID
 */
function ElementHighlight({ elementId }: { elementId: string }) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(elementId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [elementId]);

  if (!position) return null;

  return (
    <div
      className="fixed z-[102] pointer-events-none"
      style={{
        top: position.top - 4,
        left: position.left - 4,
        width: position.width + 8,
        height: position.height + 8,
      }}
    >
      <div className="w-full h-full rounded-full ring-4 ring-yellow-400 ring-opacity-75 animate-pulse" />
    </div>
  );
}

interface TutorialProps {
  /** Callback when tutorial is completed or skipped */
  onComplete?: () => void;
}

export function Tutorial({ onComplete }: TutorialProps) {
  // Wait for client-side hydration before rendering
  const isClient = useIsClient();
  const t = useTranslations("tutorial");
  const tBookmarks = useTranslations("bookmarks");

  const {
    isActive,
    currentStage,
    currentStageIndex,
    totalStages,
    canAdvanceManually,
    actionsThisStage,
    minActionsRequired,
    isWhatsNewMode,
    canGoBack,
    goBack,
    reportAction,
    advanceStage,
    skipTutorial,
    goToStage,
  } = useTutorial();

  // Persistent card completion state across swipe stages
  // For mark-all stage, we track separately since it resets
  const [swipeRightCompletedCards, setSwipeRightCompletedCards] = useState<
    Set<number>
  >(new Set());
  const [markAllCompletedCards, setMarkAllCompletedCards] = useState<
    Set<number>
  >(new Set());

  // Info icon preview state
  const [showInfoPreview, setShowInfoPreview] = useState(false);

  // Bookmark demo state for info-icon stage
  const [bookmarkDemoActive, setBookmarkDemoActive] = useState(false);

  // Day checkmark demo state
  const [dayCheckmarkClicked, setDayCheckmarkClicked] = useState(false);

  // Derive which completed cards set to use based on stage
  const completedCards = useMemo(() => {
    if (!currentStage) return new Set<number>();
    if (currentStage.id === "mark-all") return markAllCompletedCards;
    return swipeRightCompletedCards;
  }, [currentStage, swipeRightCompletedCards, markAllCompletedCards]);

  // Target card for swipe-left stage - find first completed card starting from middle
  const swipeLeftTargetIndex = useMemo(() => {
    if (!currentStage || currentStage.id !== "swipe-left") return -1;
    // Priority order: middle (1), then top (0), then bottom (2)
    const order = [1, 0, 2];
    for (const idx of order) {
      if (swipeRightCompletedCards.has(idx)) return idx;
    }
    return -1; // No completed cards left
  }, [currentStage, swipeRightCompletedCards]);

  // Determine allowed swipe direction per stage
  const allowedDirection = useMemo(() => {
    if (!currentStage) return "none" as const;
    switch (currentStage.id) {
      case "swipe-right":
        return "right" as const;
      case "swipe-left":
        return "left" as const;
      case "mark-all":
        return "left" as const;
      case "double-tap":
        return "none" as const; // Only double-tap allowed
      default:
        return "none" as const;
    }
  }, [currentStage]);

  // Determine gesture type for visual indicator
  const gestureType = useMemo(() => {
    if (!currentStage) return "none" as const;
    switch (currentStage.id) {
      case "swipe-right":
        return "swipe-right" as const;
      case "swipe-left":
        return "swipe-left" as const;
      case "mark-all":
        return "swipe-left" as const;
      case "double-tap":
        return "double-tap" as const;
      default:
        return "none" as const;
    }
  }, [currentStage]);

  // Check if current stage needs a demo card
  const showDemoCard = useMemo(() => {
    if (!currentStage) return false;
    return ["swipe-right", "swipe-left", "mark-all", "double-tap"].includes(
      currentStage.id,
    );
  }, [currentStage]);

  // Check if current stage needs multiple cards
  const showMultipleCards = useMemo(() => {
    if (!currentStage) return false;
    return ["swipe-right", "swipe-left", "mark-all"].includes(currentStage.id);
  }, [currentStage]);

  // Check if current stage requires action before Continue is enabled
  const requiresAction = useMemo(() => {
    if (!currentStage) return false;
    return (currentStage.minActionsRequired ?? 0) > 0;
  }, [currentStage]);

  // Handle card completion (swipe right) - used in swipe-right stage
  const handleCardComplete = useCallback((index: number) => {
    setSwipeRightCompletedCards((prev) => new Set([...prev, index]));
  }, []);

  // Handle card uncomplete (swipe left on completed card) - used in swipe-left stage
  const handleCardUncomplete = useCallback(
    (index: number) => {
      setSwipeRightCompletedCards((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });

      // Auto-advance to mark-all stage if all cards are uncompleted
      // Check after state update (size will be prev.size - 1)
      setSwipeRightCompletedCards((prev) => {
        if (prev.size === 0) {
          // All cards uncompleted, advance to next stage
          setTimeout(() => advanceStage(), 300);
        }
        return prev;
      });
    },
    [advanceStage],
  );

  // Handle mark all previous (swipe left on incomplete card) - used in mark-all stage
  const handleMarkAllPrevious = useCallback((index: number) => {
    setMarkAllCompletedCards((prev) => {
      const next = new Set(prev);
      for (let i = 0; i <= index; i++) {
        next.add(i);
      }
      return next;
    });
  }, []);

  // Handle tutorial completion
  const handleSkip = useCallback(() => {
    skipTutorial();
    onComplete?.();
  }, [skipTutorial, onComplete]);

  const handleNext = useCallback(() => {
    advanceStage();
    // Check if we just completed the tutorial
    if (currentStageIndex === totalStages - 1) {
      onComplete?.();
    }
  }, [advanceStage, currentStageIndex, totalStages, onComplete]);

  const handleAction = useCallback(
    (action: TutorialAction) => {
      reportAction(action);
    },
    [reportAction],
  );

  const handleGoToStage = useCallback(
    (index: number) => {
      goToStage(index);
      // Always reset demo card state so gestures can be re-practiced
      setSwipeRightCompletedCards(new Set());
      setMarkAllCompletedCards(new Set());
    },
    [goToStage],
  );

  const handleGoBack = useCallback(() => {
    goBack();
    // Always reset demo card state so gestures can be re-practiced
    setSwipeRightCompletedCards(new Set());
    setMarkAllCompletedCards(new Set());
  }, [goBack]);

  // Don't render during SSR or if tutorial is not active
  if (!isClient || !isActive || !currentStage) {
    return null;
  }

  // For manual stages requiring action, check if min actions were performed
  const actionPerformed =
    actionsThisStage >= (currentStage.minActionsRequired ?? 0);
  const canAdvance = requiresAction
    ? actionPerformed && canAdvanceManually
    : canAdvanceManually;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" />

      {/* Demo card area - centered in the screen */}
      {showDemoCard && (
        <div className="fixed inset-0 z-45 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <DemoCard
              onAction={handleAction}
              allowedDirection={allowedDirection}
              completedCards={showMultipleCards ? completedCards : undefined}
              onCardComplete={handleCardComplete}
              onCardUncomplete={handleCardUncomplete}
              onMarkAllPrevious={handleMarkAllPrevious}
              showGestureIndicator={true}
              showMultipleCards={showMultipleCards}
              gestureType={gestureType}
              stageId={currentStage.id}
              targetCardIndex={
                currentStage.id === "swipe-left"
                  ? swipeLeftTargetIndex
                  : currentStage.id === "mark-all"
                    ? 2 // Bottom card only for mark-all
                    : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Info icon visual mock-up — shared by info-icon and bookmarks stages */}
      {(currentStage.id === "info-icon" || currentStage.id === "bookmarks") && (
        <div className="fixed inset-0 z-45 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Mock card with info icon highlighted */}
            <div className="bg-white border-2 border-blue-300 rounded-xl p-4 shadow-md relative">
              {/* Highlighted info icon - clickable */}
              <button
                onClick={() => setShowInfoPreview(true)}
                className="absolute top-2 left-2 sm:-top-2 sm:-left-2 w-8 h-8 flex items-center justify-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center ring-4 ring-yellow-400 ring-opacity-75 animate-pulse shadow-lg hover:bg-blue-600 active:scale-95 transition-all">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </button>
              {/* Mock text */}
              <div className="text-gray-800 text-lg leading-relaxed text-justify pr-6">
                <span className="font-bold text-gray-900">1.</span>{" "}
                {t("demo.halakhaExample")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info sheet preview - centered overlay */}
      {(currentStage.id === "info-icon" || currentStage.id === "bookmarks") &&
        showInfoPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setShowInfoPreview(false)}
            />
            <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-800">
                  {t("demo.externalLinks")}
                </span>
                <button
                  onClick={() => setShowInfoPreview(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-3">
                {/* Bookmark toggle demo */}
                <button
                  onClick={() => setBookmarkDemoActive((v) => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bookmarkDemoActive
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill={bookmarkDemoActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {bookmarkDemoActive
                    ? tBookmarks("removeBookmark")
                    : tBookmarks("addBookmark")}
                </button>
                <ExternalLinks isPreview />
              </div>
            </div>
          </div>
        )}

      {/* Day checkmark visual mock-up */}
      {currentStage.id === "day-checkmark" && (
        <div className="fixed inset-0 z-45 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Mock day group header */}
            <div
              className={`bg-white border rounded-xl overflow-hidden shadow-md transition-all duration-300 ${dayCheckmarkClicked ? "border-green-500 opacity-60" : "border-gray-200"}`}
            >
              <div className="px-4 py-3 bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gray-500">▶</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-800 truncate">
                      {t("demo.chapterTitle")}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {t("demo.todayDate")} •{" "}
                      {dayCheckmarkClicked ? "3/3" : "0/3"}
                    </div>
                  </div>
                </div>
                {/* Progress circle button — highlighted for tutorial */}
                <button
                  onClick={() => setDayCheckmarkClicked(!dayCheckmarkClicked)}
                  className={`w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-all active:scale-95 ${
                    !dayCheckmarkClicked
                      ? "ring-4 ring-yellow-400 ring-opacity-75 animate-pulse shadow-lg"
                      : "hover:bg-black/5"
                  }`}
                >
                  <ProgressCircle
                    percentage={dayCheckmarkClicked ? 100 : 0}
                    size={28}
                    color="#3b82f6"
                  />
                </button>
              </div>
              {/* Mock cards preview */}
              <div className="p-4 bg-gray-50 space-y-2">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className={`bg-white border rounded-lg p-3 text-sm transition-all duration-300 ${
                      dayCheckmarkClicked
                        ? "border-green-400 bg-green-50 opacity-60"
                        : "border-gray-200"
                    }`}
                    dir="rtl"
                  >
                    <div className="flex items-center gap-2">
                      {dayCheckmarkClicked && (
                        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <span
                        className={
                          dayCheckmarkClicked
                            ? "line-through text-gray-500"
                            : "text-gray-800"
                        }
                      >
                        {num}. {t("demo.halakha")} {num}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header colors visual mock-up — matches new minimal header with accent bar */}
      {currentStage.id === "header-colors" && (
        <div className="fixed inset-0 z-45 flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-3">
            {/* Normal — theme primary accent bar */}
            <div
              className="bg-[var(--color-surface)] border-b-[3px] border-t-[3px] px-4 py-3 flex items-center gap-3 shadow-md"
              style={{
                borderBottomColor: "var(--color-status-normal)",
                borderTopColor: "var(--color-status-normal)",
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "var(--color-status-normal)" }}
              />
              <span className="font-medium flex-1 text-[var(--color-text-primary)]">
                {t("headerColors.blue")}
              </span>
            </div>
            {/* Offline — accent bar */}
            <div
              className="bg-[var(--color-surface)] border-b-[3px] border-t-[3px] px-4 py-3 flex items-center gap-3 shadow-md"
              style={{
                borderBottomColor: "var(--color-status-offline)",
                borderTopColor: "var(--color-status-offline)",
              }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: "var(--color-status-offline)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" />
                <path
                  d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"
                  strokeWidth="2"
                />
                <path
                  d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"
                  strokeWidth="2"
                />
              </svg>
              <span className="font-medium flex-1 text-[var(--color-text-primary)]">
                {t("headerColors.amber")}
              </span>
            </div>
            {/* Other date — red accent bar (top + bottom) */}
            <div
              className="bg-[var(--color-surface)] border-b-[3px] border-t-[3px] px-4 py-3 flex items-center gap-3 shadow-md"
              style={{
                borderBottomColor: "var(--color-status-other-date)",
                borderTopColor: "var(--color-status-other-date)",
              }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: "var(--color-status-other-date)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="font-medium flex-1 text-[var(--color-text-primary)]">
                {t("headerColors.red")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic highlights for UI elements */}
      {currentStage.highlightElement === "fab-button" && (
        <ElementHighlight elementId="fab-button" />
      )}
      {currentStage.highlightElement === "calendar-button" && (
        <ElementHighlight elementId="calendar-button" />
      )}
      {currentStage.highlightElement === "settings-button" && (
        <ElementHighlight elementId="settings-button" />
      )}

      {/* Tutorial overlay */}
      <TutorialOverlay
        stage={currentStage}
        onSkip={handleSkip}
        onNext={handleNext}
        onGoToStage={handleGoToStage}
        onGoBack={handleGoBack}
        canGoBack={canGoBack}
        canAdvance={canAdvance}
        currentStageIndex={currentStageIndex}
        totalStages={totalStages}
        actionPerformed={actionPerformed}
        actionsThisStage={actionsThisStage}
        minActionsRequired={minActionsRequired}
        isWhatsNewMode={isWhatsNewMode}
      />
    </>
  );
}
