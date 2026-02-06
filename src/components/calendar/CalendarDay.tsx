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
  /** Whether this day has any bookmarks */
  hasBookmark?: boolean;
  /** Whether this day has a summary/note */
  hasSummary?: boolean;
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
  hasBookmark,
  hasSummary,
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

  // Base styles - aspect-square ensures equal width/height, w-full fills grid cell
  let containerClasses =
    "relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors";

  // State-based styling - WCAG AA contrast compliant
  if (isDisabled) {
    containerClasses += " bg-gray-100 text-gray-700 cursor-not-allowed";
  } else if (isSelected) {
    containerClasses += " bg-[var(--color-primary)] text-white cursor-pointer";
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
        containerClasses +=
          " text-[var(--color-text-primary)] hover:bg-gray-100 cursor-pointer";
    }
  } else if (allComplete) {
    containerClasses += " bg-green-200 text-green-900 cursor-pointer";
  } else if (hasAnyProgress) {
    containerClasses += " bg-amber-100 text-amber-900 cursor-pointer";
  } else {
    containerClasses +=
      " text-[var(--color-text-primary)] hover:bg-gray-100 cursor-pointer";
  }

  // Today ring (visible even when selected)
  const todayRing = isToday && !isSelected;

  // Render dots for multi-path mode
  const renderPathDots = () => {
    if (!useMultiPath || multiPathStatus.pathStatuses.length <= 1) return null;

    // If all paths complete, show a single checkmark
    if (allComplete) {
      return (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span
            className={`text-[10px] leading-none font-bold ${isSelected ? "text-white" : "text-green-700"}`}
          >
            ✓
          </span>
        </div>
      );
    }

    return (
      <div className="flex gap-0.5 items-center absolute bottom-1 left-1/2 -translate-x-1/2">
        {multiPathStatus.pathStatuses.map((status) =>
          status.isComplete ? (
            <span
              key={status.path}
              className={`text-[8px] leading-none font-bold ${isSelected ? "text-white" : "text-green-700"}`}
            >
              ✓
            </span>
          ) : (
            <span
              key={status.path}
              className={`w-2 h-2 rounded-full ${
                status.percent > 0
                  ? isSelected
                    ? "bg-white/60"
                    : "bg-[var(--color-primary)]"
                  : isSelected
                    ? "bg-white/30"
                    : "bg-gray-400"
              }`}
            />
          ),
        )}
      </div>
    );
  };

  // Render completion indicator
  const renderCompletionIndicator = () => {
    if (isDisabled || isSelected) return null;

    if (useMultiPath) {
      // Path dots at bottom already show per-path status; skip aggregate indicator
      if (multiPathStatus.pathStatuses.length > 1) return null;

      // Single-path in multi-path mode: show aggregate
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
        <div className="absolute inset-0 rounded-lg ring-2 ring-[var(--color-primary)] ring-offset-1" />
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

      {/* Bookmark indicator - blue corner fold with white bookmark icon */}
      {hasBookmark && !isDisabled && (
        <>
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-blue-500 border-r-blue-500 border-l-[12px] border-b-[12px] border-l-transparent border-b-transparent rounded-tr-lg" />
          <svg
            className="absolute top-[2px] right-[2px] w-[9px] h-[9px] text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 4a2 2 0 012-2h10a2 2 0 012 2v18l-7-3-7 3V4z" />
          </svg>
        </>
      )}

      {/* Summary/note indicator - top left corner fold */}
      {hasSummary && !isDisabled && (
        <>
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[12px] border-l-[12px] border-t-emerald-500 border-l-emerald-500 border-r-[12px] border-b-[12px] border-r-transparent border-b-transparent rounded-tl-lg" />
          <svg
            className="absolute top-[2px] left-[2px] w-[9px] h-[9px] text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z" />
          </svg>
        </>
      )}
    </button>
  );
}

/**
 * Empty day cell for padding at start/end of month
 */
export function EmptyDay() {
  return <div className="w-full aspect-square" />;
}
