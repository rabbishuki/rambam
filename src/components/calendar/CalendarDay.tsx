"use client";

import type { DayCompletionStatus } from "@/hooks/useMonthCompletion";
import type { MultiPathDayStatus } from "@/hooks/useMultiPathCompletion";

interface CalendarDayProps {
  date: string;
  /** Day display string (gematriya for Hebrew, number for English) */
  dayDisplay: string;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  isBeforeStart: boolean;
  completionStatus: DayCompletionStatus | null;
  /** Multi-path completion status (optional, for multi-path mode) */
  multiPathStatus?: MultiPathDayStatus | null;
  onClick: () => void;
}

/**
 * Individual day cell in the calendar grid
 * Shows completion status with visual indicators
 * Supports both single-path and multi-path visualization
 */
export function CalendarDay({
  dayDisplay,
  isToday,
  isSelected,
  isFuture,
  isBeforeStart,
  completionStatus,
  multiPathStatus,
  onClick,
}: CalendarDayProps) {
  // Determine visual state
  const isDisabled = isFuture || isBeforeStart;

  // Use multi-path status if available, otherwise fall back to single-path
  const useMultiPath =
    multiPathStatus && multiPathStatus.pathStatuses.length > 0;

  // Single-path completion values (backward compat)
  const isComplete = completionStatus?.isComplete ?? false;
  const hasProgress = completionStatus && completionStatus.percent > 0;

  // Multi-path completion values
  const allComplete = useMultiPath ? multiPathStatus.allComplete : isComplete;
  const bgColor = useMultiPath ? multiPathStatus.bgColor : null;
  const hasAnyProgress = useMultiPath
    ? multiPathStatus.hasAnyProgress
    : hasProgress;

  // Base styles
  let containerClasses =
    "relative w-10 h-10 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors";

  // State-based styling - WCAG AA contrast compliant
  if (isDisabled) {
    containerClasses += " bg-gray-100 text-gray-700 cursor-not-allowed";
  } else if (isSelected) {
    containerClasses += " bg-blue-600 text-white cursor-pointer";
  } else if (useMultiPath) {
    // Multi-path background colors with proper contrast
    switch (bgColor) {
      case "green":
        containerClasses += " bg-green-200 text-green-900 cursor-pointer";
        break;
      case "orange":
        containerClasses += " bg-orange-200 text-orange-900 cursor-pointer";
        break;
      case "yellow":
        containerClasses += " bg-amber-100 text-amber-900 cursor-pointer";
        break;
      default:
        containerClasses += " text-gray-800 hover:bg-gray-100 cursor-pointer";
    }
  } else if (allComplete) {
    containerClasses += " bg-green-200 text-green-900 cursor-pointer";
  } else if (hasAnyProgress) {
    containerClasses += " bg-amber-100 text-amber-900 cursor-pointer";
  } else {
    containerClasses += " text-gray-800 hover:bg-gray-100 cursor-pointer";
  }

  // Today ring (visible even when selected)
  const todayRing = isToday && !isSelected;

  // Render dots for multi-path mode
  const renderPathDots = () => {
    if (!useMultiPath || multiPathStatus.pathStatuses.length <= 1) return null;

    return (
      <div className="flex gap-0.5 absolute top-0.5 left-1/2 -translate-x-1/2">
        {multiPathStatus.pathStatuses.map((status) => (
          <span
            key={status.path}
            className={`w-1.5 h-1.5 rounded-full ${
              status.isComplete
                ? "bg-green-700"
                : status.percent > 0
                  ? "bg-amber-600"
                  : "bg-gray-400"
            }`}
          />
        ))}
      </div>
    );
  };

  // Render completion indicator
  const renderCompletionIndicator = () => {
    if (isDisabled || isSelected) return null;

    if (useMultiPath) {
      // Multi-path: show aggregate percent if not all complete
      if (allComplete) {
        return (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
            <span className="text-green-700 text-[10px] leading-none font-bold">
              ✓
            </span>
          </div>
        );
      } else if (
        multiPathStatus.aggregateIncompletePercent !== null &&
        multiPathStatus.aggregateIncompletePercent > 0
      ) {
        return (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
            <span className="text-[8px] text-amber-700 font-semibold">
              {multiPathStatus.aggregateIncompletePercent}%
            </span>
          </div>
        );
      }
      return null;
    }

    // Single-path mode (backward compat)
    if (!completionStatus) return null;

    if (isComplete) {
      return (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span className="text-green-700 text-[10px] leading-none font-bold">
            ✓
          </span>
        </div>
      );
    } else if (hasProgress) {
      return (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span className="text-[8px] text-amber-700 font-semibold">
            {completionStatus.percent}%
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={containerClasses}
      aria-label={`Day ${dayDisplay}`}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
    >
      {/* Today indicator ring */}
      {todayRing && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-offset-1" />
      )}

      {/* Path dots for multi-path mode */}
      {renderPathDots()}

      {/* Day number */}
      <span className={allComplete && !isSelected ? "font-bold" : ""}>
        {dayDisplay}
      </span>

      {/* Completion indicator */}
      {renderCompletionIndicator()}

      {/* Selected day checkmark (shown on green background) */}
      {isSelected && allComplete && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span className="text-white text-[10px] leading-none">✓</span>
        </div>
      )}
    </button>
  );
}

/**
 * Empty day cell for padding at start/end of month
 */
export function EmptyDay() {
  return <div className="w-10 h-10" />;
}
