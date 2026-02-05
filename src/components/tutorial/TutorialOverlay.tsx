/**
 * TutorialOverlay Component
 *
 * A floating instruction panel that displays the current tutorial stage
 * information with title, instruction, and optional hint.
 */

"use client";

import { useTranslations } from "next-intl";
import { TutorialStage } from "@/config/tutorialStages";

interface TutorialOverlayProps {
  stage: TutorialStage;
  onSkip: () => void;
  onNext?: () => void;
  onGoToStage?: (index: number) => void;
  canAdvance: boolean;
  currentStageIndex: number;
  totalStages: number;
  /** Whether user has performed the required action (for stages with minActionsRequired) */
  actionPerformed?: boolean;
  /** Number of actions performed this stage */
  actionsThisStage?: number;
  /** Minimum actions required to advance */
  minActionsRequired?: number;
}

export function TutorialOverlay({
  stage,
  onSkip,
  onNext,
  canAdvance,
  currentStageIndex,
  totalStages,
  onGoToStage,
  actionPerformed = false,
  actionsThisStage = 0,
  minActionsRequired = 0,
}: TutorialOverlayProps) {
  const t = useTranslations();
  const isManualAdvance = stage.advanceOn.type === "manual";
  const isFinalStage = stage.id === "complete";
  const requiresAction = (stage.minActionsRequired ?? 0) > 0;

  // Check if this is a multi-action stage (more than 1 action required)
  const isMultiActionStage = minActionsRequired > 1;
  // Show progress for multi-action stages that haven't completed yet
  const showProgress = isMultiActionStage && !actionPerformed;

  // For double-tap stage, show special button text
  const isDoubleTapStage = stage.id === "double-tap";
  const showContinueButton = isManualAdvance && !isFinalStage && onNext;

  // Determine button text
  const buttonText =
    isDoubleTapStage && actionPerformed
      ? t("tutorial.doubleTap.continue")
      : t("tutorial.next");

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 flex items-center justify-between">
          <h3 className="font-bold text-blue-800 text-sm">
            {t(stage.titleKey)}
          </h3>
          <button
            onClick={onSkip}
            tabIndex={-1}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            {t("tutorial.skip")}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            {t(stage.instructionKey)}
          </p>

          {stage.hintKey && (
            <p className="mt-2 text-blue-500 text-xs italic">
              {t("tutorial.hint")}: {t(stage.hintKey)}
            </p>
          )}

          {/* Progress counter for multi-action stages */}
          {showProgress && (
            <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: minActionsRequired }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < actionsThisStage ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">
                {t("tutorial.progress", {
                  current: actionsThisStage,
                  total: minActionsRequired,
                })}
              </span>
            </div>
          )}

          {/* Success feedback for stages requiring action */}
          {requiresAction && actionPerformed && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">
                {isDoubleTapStage
                  ? t("tutorial.doubleTap.success")
                  : t("tutorial.actionComplete")}
              </span>
            </div>
          )}
        </div>

        {/* Footer with progress and action */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {/* Progress dots - clickable to go back to previous stages */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalStages }, (_, i) => {
              const isCompleted = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              const canClick = isCompleted && onGoToStage;

              return (
                <button
                  key={i}
                  onClick={() => canClick && onGoToStage(i)}
                  disabled={!canClick}
                  tabIndex={-1}
                  title={
                    canClick
                      ? t("tutorial.goToStep", { step: i + 1 })
                      : undefined
                  }
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isCompleted
                      ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                      : isCurrent
                        ? "bg-blue-400 ring-2 ring-blue-200 cursor-default"
                        : "bg-gray-200 cursor-default"
                  }`}
                />
              );
            })}
          </div>

          {/* Action button */}
          {showContinueButton && (
            <button
              onClick={onNext}
              disabled={!canAdvance}
              tabIndex={-1}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                canAdvance
                  ? actionPerformed && requiresAction
                    ? "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {buttonText}
            </button>
          )}

          {isFinalStage && (
            <button
              onClick={onSkip}
              tabIndex={-1}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 shadow-sm transition-all"
            >
              {t("tutorial.start")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
