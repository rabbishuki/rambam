/**
 * DemoCard Component
 *
 * A practice card for the tutorial that demonstrates swipe gestures.
 * Supports external state management for persistent card completion across stages.
 */

"use client";

import { useCallback, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { GestureIndicator } from "./GestureIndicator";
import type { TutorialAction } from "@/hooks/useTutorial";

interface DemoCardProps {
  onAction: (action: TutorialAction) => void;
  /** Which swipe direction is enabled (locks the other direction) */
  allowedDirection: "left" | "right" | "both" | "none";
  /** External completion state for persistent cards across stages */
  completedCards?: Set<number>;
  /** Callback when a card is completed via swipe right */
  onCardComplete?: (index: number) => void;
  /** Callback when a card is uncompleted via swipe left */
  onCardUncomplete?: (index: number) => void;
  /** Callback for mark-all-previous action */
  onMarkAllPrevious?: (index: number) => void;
  /** Show gesture indicator animation */
  showGestureIndicator?: boolean;
  /** Show 3 stacked cards (for swipe stages) vs single card (for double-tap) */
  showMultipleCards?: boolean;
  /** Which gesture type to indicate */
  gestureType?: "swipe-right" | "swipe-left" | "double-tap" | "none";
  /** Current tutorial stage ID (to distinguish swipe-left from mark-all) */
  stageId?: string;
  /** Target card index for swipe-left stage (show gesture on this card only) */
  targetCardIndex?: number;
}

// Swipe threshold to trigger action (in pixels)
const SWIPE_THRESHOLD = 100;

// Demo card translation keys
const DEMO_CARD_KEYS = ["card1", "card2", "card3"] as const;

interface SingleCardProps {
  index: number;
  text: string;
  isHebrew: boolean;
  isCompleted: boolean;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onDoubleTap?: () => void;
  allowedDirection: "left" | "right" | "both" | "none";
  showGestureIndicator?: boolean;
  gestureType?: "swipe-right" | "swipe-left" | "double-tap" | "none";
  isTopCard?: boolean;
  stackOffset?: number;
  /** Index of the first incomplete card (for visual targeting) */
  firstIncompleteIndex?: number;
  /** Current tutorial stage ID (to distinguish swipe-left from mark-all) */
  stageId?: string;
  /** Target card index for showing gesture (swipe-left: specific completed card, mark-all: bottom card) */
  targetCardIndex?: number;
}

function SingleCard({
  index,
  text,
  isHebrew,
  isCompleted,
  onSwipeRight,
  onSwipeLeft,
  onDoubleTap,
  allowedDirection,
  showGestureIndicator = false,
  gestureType = "none",
  isTopCard = true,
  stackOffset = 0,
  firstIncompleteIndex = 0,
  stageId,
  targetCardIndex,
}: SingleCardProps) {
  const t = useTranslations("swipe");

  // Determine which swipe handlers to enable based on direction lock
  const enabledSwipeRight =
    allowedDirection === "right" || allowedDirection === "both"
      ? onSwipeRight
      : undefined;
  const enabledSwipeLeft =
    allowedDirection === "left" || allowedDirection === "both"
      ? onSwipeLeft
      : undefined;
  const enabledDoubleTap =
    allowedDirection === "none" ? onDoubleTap : undefined;

  const { handlers, state, style } = useSwipeGesture({
    onSwipeRight: isTopCard ? enabledSwipeRight : undefined,
    onSwipeLeft: isTopCard ? enabledSwipeLeft : undefined,
    onDoubleTap: isTopCard ? enabledDoubleTap : undefined,
  });

  // Calculate swipe feedback visibility (0-1)
  const swipeProgress = Math.min(Math.abs(state.deltaX) / SWIPE_THRESHOLD, 1);
  const isOverThreshold = Math.abs(state.deltaX) >= SWIPE_THRESHOLD;

  // Determine if we should show highlight animation
  const showHighlight = isTopCard && !state.isSwiping && !isCompleted;

  // Show gesture indicator based on stage:
  // - swipe-right: first incomplete card
  // - swipe-left (undo): only on targetCardIndex (one at a time)
  // - mark-all: only on targetCardIndex (bottom card, index 2)
  // - double-tap: always
  const showIndicator =
    isTopCard &&
    showGestureIndicator &&
    !state.isSwiping &&
    (gestureType === "swipe-right"
      ? index === firstIncompleteIndex && !isCompleted
      : gestureType === "swipe-left"
        ? stageId === "mark-all"
          ? targetCardIndex !== undefined &&
            index === targetCardIndex &&
            !isCompleted // Mark-all: only on target card (bottom)
          : targetCardIndex !== undefined &&
            index === targetCardIndex &&
            isCompleted // Swipe-left (undo): only on target completed card
        : gestureType === "double-tap"
          ? true
          : false);

  return (
    <div
      className="relative"
      style={{
        transform: `translateY(${stackOffset * 8}px) scale(${1 - stackOffset * 0.03})`,
        zIndex: 10 - stackOffset,
      }}
    >
      {/* Swipe hint animations */}
      {showHighlight &&
        gestureType === "swipe-right" &&
        index === firstIncompleteIndex && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-green-200 to-transparent opacity-50 animate-pulse rounded-xl" />
          </div>
        )}
      {/* Swipe left highlight: for undo stage show on target completed, for mark-all show on target (bottom) card */}
      {isTopCard &&
        !state.isSwiping &&
        gestureType === "swipe-left" &&
        targetCardIndex !== undefined &&
        index === targetCardIndex &&
        (stageId === "mark-all" ? !isCompleted : isCompleted) && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-blue-200 to-transparent opacity-50 animate-pulse rounded-xl" />
          </div>
        )}

      {/* Swipe feedback overlays - positioned behind the card */}
      {isTopCard && state.isSwiping && (
        <>
          {/* RIGHT swipe feedback */}
          {state.direction === "right" && enabledSwipeRight && (
            <div
              className={`
                absolute inset-y-0 left-0 rounded-xl
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

          {/* LEFT swipe feedback */}
          {state.direction === "left" && enabledSwipeLeft && (
            <div
              className={`
                absolute inset-y-0 right-0 rounded-xl
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
                    : t("markAllPrevious", { count: index + 1 })}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* The actual card */}
      <div
        className={`
          bg-white border-2 rounded-xl p-4
          text-lg leading-relaxed
          relative
          shadow-md
          touch-pan-y select-none
          transition-all duration-300
          ${isTopCard ? "cursor-grab active:cursor-grabbing hover:shadow-lg" : ""}
          ${
            isCompleted
              ? "opacity-60 bg-green-50 border-green-400"
              : "border-blue-300"
          }
          ${
            showIndicator
              ? "ring-4 ring-blue-400 ring-opacity-75 animate-pulse border-blue-500"
              : ""
          }
        `}
        style={isTopCard ? style : undefined}
        {...(isTopCard ? handlers : {})}
      >
        {/* Completion checkmark */}
        {isCompleted && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
            ✓
          </div>
        )}

        {/* Demo text */}
        <div
          className={`
            ${isCompleted ? "line-through text-gray-500" : "text-gray-800"}
            text-justify
          `}
          dir={isHebrew ? "rtl" : "ltr"}
        >
          <span className="font-bold text-gray-900">
            {isHebrew ? ["א", "ב", "ג"][index] || "א" : index + 1}.
          </span>{" "}
          {text}
        </div>
      </div>

      {/* Gesture indicator - rendered after card to appear on top */}
      {showIndicator && <GestureIndicator gesture={gestureType} />}
    </div>
  );
}

export function DemoCard({
  onAction,
  allowedDirection,
  completedCards: externalCompletedCards,
  onCardComplete,
  onCardUncomplete,
  onMarkAllPrevious,
  showGestureIndicator = true,
  showMultipleCards = false,
  gestureType = "none",
  stageId,
  targetCardIndex,
}: DemoCardProps) {
  const locale = useLocale();
  const isHebrew = locale === "he";
  const tDemo = useTranslations("tutorial.demo");

  // Internal state for when external state is not provided
  const [internalCompletedCards, setInternalCompletedCards] = useState<
    Set<number>
  >(new Set());
  const [singleCardCompleted, setSingleCardCompleted] = useState(false);

  // Use external state if provided, otherwise use internal
  const completedCards = externalCompletedCards ?? internalCompletedCards;

  // Find the first incomplete card index
  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < DEMO_CARD_KEYS.length; i++) {
      if (!completedCards.has(i)) return i;
    }
    return DEMO_CARD_KEYS.length; // All complete
  }, [completedCards]);

  // Handle swipe right on a specific card
  const handleSwipeRight = useCallback(
    (cardIndex: number) => {
      if (showMultipleCards) {
        if (externalCompletedCards && onCardComplete) {
          // External state mode - complete one card at a time
          onCardComplete(cardIndex);
        } else {
          // Internal state mode - complete one card
          setInternalCompletedCards((prev) => new Set([...prev, cardIndex]));
        }
      } else {
        setSingleCardCompleted((prev) => !prev);
      }
      onAction("swipe-right");
    },
    [onAction, showMultipleCards, externalCompletedCards, onCardComplete],
  );

  // Handle swipe left on a specific card
  const handleSwipeLeft = useCallback(
    (cardIndex: number) => {
      if (showMultipleCards) {
        if (externalCompletedCards && onCardUncomplete && onMarkAllPrevious) {
          // External state mode
          if (completedCards.has(cardIndex)) {
            // Card is complete - uncomplete it
            onCardUncomplete(cardIndex);
          } else {
            // Card is incomplete - mark all previous (including this one)
            onMarkAllPrevious(cardIndex);
          }
        } else {
          // Internal state mode
          if (completedCards.has(cardIndex)) {
            // Uncomplete card
            setInternalCompletedCards((prev) => {
              const next = new Set(prev);
              next.delete(cardIndex);
              return next;
            });
          } else {
            // Mark all previous including this one
            setInternalCompletedCards((prev) => {
              const next = new Set(prev);
              for (let i = 0; i <= cardIndex; i++) {
                next.add(i);
              }
              return next;
            });
          }
        }
      } else {
        setSingleCardCompleted((prev) => !prev);
      }
      onAction("swipe-left");
    },
    [
      onAction,
      showMultipleCards,
      externalCompletedCards,
      onCardUncomplete,
      onMarkAllPrevious,
      completedCards,
    ],
  );

  // Handle double-tap
  const handleDoubleTap = useCallback(() => {
    setSingleCardCompleted((prev) => !prev);
    onAction("double-tap");
  }, [onAction]);

  if (showMultipleCards) {
    // Render all 3 cards stacked, with the first incomplete card on top
    // For swipe-right: first incomplete card is interactive
    // For swipe-left: any completed card can be swiped
    // For mark-all: any incomplete card can trigger mark-all-previous

    return (
      <div className="relative space-y-2">
        {/* Render cards in order, with visual stacking via z-index */}
        {DEMO_CARD_KEYS.map((key, index) => {
          const isCompleted = completedCards.has(index);
          const isFirstIncomplete = index === firstIncompleteIndex;

          // Determine if this card should be interactive
          let isInteractive = false;
          if (allowedDirection === "right") {
            // Swipe-right stage: only first incomplete card is interactive
            isInteractive = isFirstIncomplete && !isCompleted;
          } else if (allowedDirection === "left") {
            // Swipe-left or mark-all stage: only targetCardIndex is interactive
            if (stageId === "swipe-left") {
              // Undo stage: only the target completed card is interactive
              isInteractive =
                targetCardIndex !== undefined &&
                index === targetCardIndex &&
                isCompleted;
            } else if (stageId === "mark-all") {
              // Mark-all stage: only the target card (bottom) is interactive
              isInteractive =
                targetCardIndex !== undefined &&
                index === targetCardIndex &&
                !isCompleted;
            } else {
              // Default: all cards can be swiped
              isInteractive = true;
            }
          }

          return (
            <SingleCard
              key={index}
              index={index}
              text={tDemo(key)}
              isHebrew={isHebrew}
              isCompleted={isCompleted}
              onSwipeRight={() => handleSwipeRight(index)}
              onSwipeLeft={() => handleSwipeLeft(index)}
              onDoubleTap={handleDoubleTap}
              allowedDirection={allowedDirection}
              showGestureIndicator={showGestureIndicator}
              gestureType={gestureType}
              isTopCard={isInteractive}
              stackOffset={0}
              firstIncompleteIndex={firstIncompleteIndex}
              stageId={stageId}
              targetCardIndex={targetCardIndex}
            />
          );
        })}
      </div>
    );
  }

  // Single card mode (for double-tap stage)
  return (
    <SingleCard
      index={0}
      text={tDemo("doubleTapCard")}
      isHebrew={isHebrew}
      isCompleted={singleCardCompleted}
      onSwipeRight={() => handleSwipeRight(0)}
      onSwipeLeft={() => handleSwipeLeft(0)}
      onDoubleTap={handleDoubleTap}
      allowedDirection={allowedDirection}
      showGestureIndicator={showGestureIndicator}
      gestureType={gestureType}
      isTopCard={true}
      stackOffset={0}
      firstIncompleteIndex={0}
      stageId={stageId}
    />
  );
}
