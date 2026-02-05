/**
 * useTutorial Hook
 *
 * Manages the tutorial state with individual step tracking.
 * Supports "What's New" mode for returning users when new stages are added.
 *
 * Uses localStorage to persist progress across sessions (SSR-safe).
 */

"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import { TUTORIAL_STAGES, TutorialStage } from "@/config/tutorialStages";

// SSR-safe localStorage options
const SSR_SAFE = { initializeWithValue: false };

// Storage key for tutorial progress (v2 with stage ID tracking)
const STORAGE_KEY = "rambam-tutorial-progress-v2";
// Legacy storage key for migration
const LEGACY_STORAGE_KEY = "rambam-tutorial-progress-v1";

// New progress format - tracks individual stage completions
interface TutorialProgressV2 {
  completedStageIds: string[]; // IDs of completed stages
  skippedStageIds: string[]; // IDs of stages user chose to skip
  actionsThisStage: number; // Count of actions performed in current stage
}

// Legacy format for migration
interface LegacyTutorialProgress {
  currentStageIndex: number;
  completed: boolean;
  skipped: boolean;
  actionsThisStage: number;
  completedAt?: string;
}

const DEFAULT_PROGRESS: TutorialProgressV2 = {
  completedStageIds: [],
  skippedStageIds: [],
  actionsThisStage: 0,
};

/**
 * Migrate from legacy format to new format
 */
function migrateLegacyProgress(
  legacy: LegacyTutorialProgress,
): TutorialProgressV2 {
  if (legacy.completed) {
    // User completed tutorial - mark all current stages as completed
    return {
      completedStageIds: TUTORIAL_STAGES.map((s) => s.id),
      skippedStageIds: [],
      actionsThisStage: 0,
    };
  }

  if (legacy.skipped) {
    // User skipped tutorial - mark all current stages as skipped
    return {
      completedStageIds: [],
      skippedStageIds: TUTORIAL_STAGES.map((s) => s.id),
      actionsThisStage: 0,
    };
  }

  // User was mid-tutorial - mark completed stages
  const completedIds = TUTORIAL_STAGES.slice(0, legacy.currentStageIndex).map(
    (s) => s.id,
  );

  return {
    completedStageIds: completedIds,
    skippedStageIds: [],
    actionsThisStage: legacy.actionsThisStage || 0,
  };
}

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

  // "What's New" mode
  isWhatsNewMode: boolean; // True if showing only new stages to returning user
  hasNewStages: boolean; // True if there are stages user hasn't seen

  // Actions
  reportAction: (action: TutorialAction) => void;
  advanceStage: () => void;
  goToStage: (index: number) => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  showWhatsNew: () => void; // Clears skipped stages to show them as "new"

  // Can advance manually (for stages with "manual" advancement)
  canAdvanceManually: boolean;
}

/**
 * Hook for managing tutorial state with individual step tracking
 */
export function useTutorial(): UseTutorialReturn {
  const [progress, setProgress] = useLocalStorage<TutorialProgressV2>(
    STORAGE_KEY,
    DEFAULT_PROGRESS,
    SSR_SAFE,
  );

  // Check for and migrate legacy progress on first load
  useMemo(() => {
    if (typeof window === "undefined") return;

    // Check if we need to migrate from legacy format
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    const newData = localStorage.getItem(STORAGE_KEY);

    if (legacyData && !newData) {
      try {
        const legacy = JSON.parse(legacyData) as LegacyTutorialProgress;
        const migrated = migrateLegacyProgress(legacy);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        // Keep legacy for safety but it won't be used anymore
      } catch {
        // Ignore migration errors
      }
    }
  }, []);

  // Calculate which stages are known (completed or skipped)
  const knownStageIds = useMemo(() => {
    return new Set([
      ...progress.completedStageIds,
      ...progress.skippedStageIds,
    ]);
  }, [progress.completedStageIds, progress.skippedStageIds]);

  // Find stages that haven't been seen yet
  const uncompletedStages = useMemo(() => {
    return TUTORIAL_STAGES.filter((stage) => !knownStageIds.has(stage.id));
  }, [knownStageIds]);

  // Determine tutorial mode
  const hasAnyProgress = knownStageIds.size > 0;
  const hasNewStages = uncompletedStages.length > 0;

  // Fresh user: no progress → show full tutorial
  // Returning user with new stages → show "What's New"
  // All stages known → no tutorial needed
  const showTutorial = hasNewStages;
  const isWhatsNewMode = hasAnyProgress && hasNewStages;

  // Get the stages to show (all for new users, only new for returning users)
  const stagesToShow = useMemo(() => {
    if (!hasAnyProgress) {
      return TUTORIAL_STAGES; // Fresh user - show all
    }
    return uncompletedStages; // Returning user - show only new stages
  }, [hasAnyProgress, uncompletedStages]);

  // Current stage index within the stages being shown
  const currentStageIndex = useMemo(() => {
    if (stagesToShow.length === 0) return 0;
    // Find first uncompleted stage in the stages we're showing
    const firstUncompleted = stagesToShow.findIndex(
      (stage) => !progress.completedStageIds.includes(stage.id),
    );
    return firstUncompleted >= 0 ? firstUncompleted : 0;
  }, [stagesToShow, progress.completedStageIds]);

  // Current stage
  const currentStage = useMemo(() => {
    if (!showTutorial || stagesToShow.length === 0) return null;
    return stagesToShow[currentStageIndex] ?? null;
  }, [showTutorial, stagesToShow, currentStageIndex]);

  // Check if manual advancement is allowed
  const canAdvanceManually = useMemo(() => {
    if (!currentStage) return false;
    return currentStage.advanceOn.type === "manual";
  }, [currentStage]);

  // Get minimum actions required for current stage
  const minActionsRequired = useMemo(() => {
    return currentStage?.minActionsRequired ?? 0;
  }, [currentStage]);

  // Complete current stage and advance
  const advanceStage = useCallback(() => {
    if (!currentStage) return;

    setProgress((prev) => {
      const newCompletedIds = [
        ...new Set([...prev.completedStageIds, currentStage.id]),
      ];

      return {
        ...prev,
        completedStageIds: newCompletedIds,
        actionsThisStage: 0,
      };
    });
  }, [currentStage, setProgress]);

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
    // Mark all remaining stages as skipped
    const remainingIds = uncompletedStages.map((s) => s.id);
    setProgress((prev) => ({
      ...prev,
      skippedStageIds: [...new Set([...prev.skippedStageIds, ...remainingIds])],
      actionsThisStage: 0,
    }));
  }, [uncompletedStages, setProgress]);

  // Reset the tutorial to the beginning
  const resetTutorial = useCallback(() => {
    setProgress({
      completedStageIds: [],
      skippedStageIds: [],
      actionsThisStage: 0,
    });
  }, [setProgress]);

  // Show "What's New" by clearing skipped stages
  const showWhatsNew = useCallback(() => {
    setProgress((prev) => ({
      ...prev,
      skippedStageIds: [], // Clear skipped so they become "new" again
      actionsThisStage: 0,
    }));
  }, [setProgress]);

  // Go to a specific stage (for going back to previous stages)
  const goToStage = useCallback(
    (index: number) => {
      if (index < 0 || index >= stagesToShow.length) return;

      // Mark all stages before this index as completed
      const stagesToComplete = stagesToShow.slice(0, index).map((s) => s.id);

      // Remove the target stage from completed (so it shows as current)
      const targetStageId = stagesToShow[index]?.id;

      setProgress((prev) => ({
        ...prev,
        completedStageIds: prev.completedStageIds.filter(
          (id) =>
            id !== targetStageId ||
            !stagesToShow.slice(index).some((s) => s.id === id),
        ),
        actionsThisStage: 0,
      }));

      // Add the stages to complete
      if (stagesToComplete.length > 0) {
        setProgress((prev) => ({
          ...prev,
          completedStageIds: [
            ...new Set([...prev.completedStageIds, ...stagesToComplete]),
          ],
        }));
      }
    },
    [stagesToShow, setProgress],
  );

  // Check if user has skipped any stages (for settings button visibility)
  const hasSkipped = progress.skippedStageIds.length > 0;

  return {
    // State
    isActive: showTutorial,
    currentStage,
    currentStageIndex,
    totalStages: stagesToShow.length,
    hasSkipped,
    actionsThisStage: progress.actionsThisStage,
    minActionsRequired,

    // "What's New" mode
    isWhatsNewMode,
    hasNewStages,

    // Actions
    reportAction,
    advanceStage,
    goToStage,
    skipTutorial,
    resetTutorial,
    showWhatsNew,

    // Manual advancement
    canAdvanceManually,
  };
}
