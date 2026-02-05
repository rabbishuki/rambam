/**
 * useTutorial Hook
 *
 * Manages the tutorial state, tracking which stage the user is at
 * and handling advancement through stages based on user actions.
 *
 * Uses localStorage to persist progress across sessions (SSR-safe).
 */

"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  TUTORIAL_STAGES,
  TutorialStage,
  isFinalStage,
} from "@/config/tutorialStages";

// SSR-safe localStorage options
const SSR_SAFE = { initializeWithValue: false };

// Storage key for tutorial progress
const STORAGE_KEY = "rambam-tutorial-progress-v1";

// Stored tutorial state
interface TutorialProgress {
  currentStageIndex: number;
  completed: boolean;
  skipped: boolean;
  actionsThisStage: number; // Count of actions performed in current stage
  completedAt?: string; // ISO timestamp when tutorial was completed/skipped
}

const DEFAULT_PROGRESS: TutorialProgress = {
  currentStageIndex: 0,
  completed: false,
  skipped: false,
  actionsThisStage: 0,
};

// Action types that can be reported to advance the tutorial
export type TutorialAction =
  | "swipe-right"
  | "swipe-left"
  | "double-tap"
  | "calendar-open"
  | "settings-open";

// Return type for the hook
export interface UseTutorialReturn {
  // State
  isActive: boolean;
  currentStage: TutorialStage | null;
  currentStageIndex: number;
  totalStages: number;
  hasSkipped: boolean;
  actionsThisStage: number; // Count of actions performed in current stage
  minActionsRequired: number; // Minimum actions required to advance

  // Actions
  reportAction: (action: TutorialAction) => void;
  advanceStage: () => void;
  goToStage: (index: number) => void;
  skipTutorial: () => void;
  resetTutorial: () => void;

  // Can advance manually (for stages with "manual" advancement)
  canAdvanceManually: boolean;
}

/**
 * Hook for managing tutorial state
 */
export function useTutorial(): UseTutorialReturn {
  const [progress, setProgress] = useLocalStorage<TutorialProgress>(
    STORAGE_KEY,
    DEFAULT_PROGRESS,
    SSR_SAFE,
  );

  // Current stage (null if tutorial is completed)
  const currentStage = useMemo(() => {
    if (progress.completed || progress.skipped) return null;
    return TUTORIAL_STAGES[progress.currentStageIndex] ?? null;
  }, [progress.completed, progress.skipped, progress.currentStageIndex]);

  // Check if manual advancement is allowed
  const canAdvanceManually = useMemo(() => {
    if (!currentStage) return false;
    return currentStage.advanceOn.type === "manual";
  }, [currentStage]);

  // Get minimum actions required for current stage
  const minActionsRequired = useMemo(() => {
    return currentStage?.minActionsRequired ?? 0;
  }, [currentStage]);

  // Advance to next stage
  const advanceStage = useCallback(() => {
    setProgress((prev) => {
      const nextIndex = prev.currentStageIndex + 1;

      // Check if we're past the last stage
      if (nextIndex >= TUTORIAL_STAGES.length) {
        return {
          ...prev,
          completed: true,
          actionsThisStage: 0,
          completedAt: new Date().toISOString(),
        };
      }

      // Check if current stage is the "complete" stage
      const currentStageId = TUTORIAL_STAGES[prev.currentStageIndex]?.id;
      if (currentStageId && isFinalStage(currentStageId)) {
        return {
          ...prev,
          completed: true,
          actionsThisStage: 0,
          completedAt: new Date().toISOString(),
        };
      }

      return {
        ...prev,
        currentStageIndex: nextIndex,
        actionsThisStage: 0, // Reset action count when advancing
      };
    });
  }, [setProgress]);

  // Report an action to potentially advance the tutorial
  const reportAction = useCallback(
    (action: TutorialAction) => {
      if (!currentStage) return;

      const condition = currentStage.advanceOn;
      let isMatchingAction = false;

      switch (condition.type) {
        case "swipe-right":
          if (action === "swipe-right") isMatchingAction = true;
          break;
        case "swipe-left":
          if (action === "swipe-left") isMatchingAction = true;
          break;
        case "double-tap":
          if (action === "double-tap") isMatchingAction = true;
          break;
        case "calendar-open":
          if (action === "calendar-open") isMatchingAction = true;
          break;
        case "settings-open":
          if (action === "settings-open") isMatchingAction = true;
          break;
        case "manual":
          // Manual stages track actions but don't auto-advance
          if (
            action === "swipe-right" ||
            action === "swipe-left" ||
            action === "double-tap"
          ) {
            isMatchingAction = true;
          }
          break;
      }

      if (isMatchingAction) {
        const minRequired = currentStage.minActionsRequired ?? 0;
        const newActionCount = progress.actionsThisStage + 1;

        // Update action count
        setProgress((prev) => ({
          ...prev,
          actionsThisStage: newActionCount,
        }));

        // For non-manual stages, check if we've reached minActionsRequired to auto-advance
        if (condition.type !== "manual" && newActionCount >= minRequired) {
          advanceStage();
        }
      }
    },
    [currentStage, advanceStage, progress.actionsThisStage, setProgress],
  );

  // Skip the tutorial entirely
  const skipTutorial = useCallback(() => {
    setProgress({
      currentStageIndex: TUTORIAL_STAGES.length - 1,
      completed: false,
      skipped: true,
      actionsThisStage: 0,
      completedAt: new Date().toISOString(),
    });
  }, [setProgress]);

  // Reset the tutorial to the beginning
  const resetTutorial = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
  }, [setProgress]);

  // Go to a specific stage (for going back to previous stages)
  const goToStage = useCallback(
    (index: number) => {
      if (index < 0 || index >= TUTORIAL_STAGES.length) return;
      setProgress({
        currentStageIndex: index,
        completed: false,
        skipped: false,
        actionsThisStage: 0,
      });
    },
    [setProgress],
  );

  return {
    // State
    isActive: !progress.completed && !progress.skipped,
    currentStage,
    currentStageIndex: progress.currentStageIndex,
    totalStages: TUTORIAL_STAGES.length,
    hasSkipped: progress.skipped,
    actionsThisStage: progress.actionsThisStage,
    minActionsRequired,

    // Actions
    reportAction,
    advanceStage,
    goToStage,
    skipTutorial,
    resetTutorial,

    // Manual advancement
    canAdvanceManually,
  };
}
