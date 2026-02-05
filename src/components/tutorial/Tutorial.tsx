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
import { useTutorial, TutorialAction } from "@/hooks/useTutorial";
import { TutorialOverlay } from "./TutorialOverlay";
import { DemoCard } from "./DemoCard";
import { ExternalLinks } from "@/components/halakha/ExternalLinks";

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

  const {
    isActive,
    currentStage,
    currentStageIndex,
    totalStages,
    canAdvanceManually,
    actionsThisStage,
    minActionsRequired,
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
      // Reset card state when going back to swipe-right stage
      if (index <= 1) {
        setSwipeRightCompletedCards(new Set());
        setMarkAllCompletedCards(new Set());
      }
    },
    [goToStage],
  );

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

      {/* Info icon visual mock-up */}
      {currentStage.id === "info-icon" && (
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
              <div
                className="text-gray-800 text-lg leading-relaxed text-justify pr-6"
                dir="rtl"
              >
                <span className="font-bold text-gray-900">א.</span> הלכה לדוגמה
                - לחץ על כפתור המידע כדי לראות קישורים נוספים לספריא
                ו-Chabad.org
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info sheet preview - centered overlay */}
      {currentStage.id === "info-icon" && showInfoPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowInfoPreview(false)}
          />
          <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-gray-800" dir="rtl">
                קישורים חיצוניים
              </span>
              <button
                onClick={() => setShowInfoPreview(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
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
                    <div
                      className="text-lg font-semibold text-gray-800 truncate"
                      dir="rtl"
                    >
                      הלכות דעות פרק א׳
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5" dir="rtl">
                      היום • י&quot;ח שבט •{" "}
                      {dayCheckmarkClicked ? "3/3" : "0/3"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Highlighted checkmark button - clickable */}
                  {!dayCheckmarkClicked ? (
                    <button
                      onClick={() => setDayCheckmarkClicked(true)}
                      className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-500 text-white text-xl ring-4 ring-yellow-400 ring-opacity-75 animate-pulse shadow-lg hover:bg-blue-600 active:scale-95 transition-all cursor-pointer"
                    >
                      ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => setDayCheckmarkClicked(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-md text-gray-400 hover:bg-black/5 text-2xl cursor-pointer"
                    >
                      ↺
                    </button>
                  )}
                </div>
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
                        {["א", "ב", "ג"][num - 1]}. הלכה לדוגמה {num}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
        canAdvance={canAdvance}
        currentStageIndex={currentStageIndex}
        totalStages={totalStages}
        actionPerformed={actionPerformed}
        actionsThisStage={actionsThisStage}
        minActionsRequired={minActionsRequired}
      />
    </>
  );
}
