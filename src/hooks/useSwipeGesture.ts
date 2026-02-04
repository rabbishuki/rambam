/**
 * Hook for swipe gesture detection
 * Supports both touch and mouse interactions
 * RTL-aware (directions work correctly for Hebrew)
 */

import { useState, useCallback, useRef } from "react";

interface SwipeState {
  deltaX: number;
  deltaY: number;
  isSwiping: boolean;
  direction: "left" | "right" | null;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

interface UseSwipeGestureOptions {
  /** Minimum distance in pixels to trigger swipe (default: 100) */
  threshold?: number;
  /** Called when swiped right (mark complete) */
  onSwipeRight?: () => void;
  /** Called when swiped left (mark incomplete) */
  onSwipeLeft?: () => void;
  /** Called on double tap/click (toggle) */
  onDoubleTap?: () => void;
  /** Whether the item is already completed */
  isCompleted?: boolean;
}

interface UseSwipeGestureReturn {
  handlers: SwipeHandlers;
  state: SwipeState;
  style: React.CSSProperties;
}

const DOUBLE_TAP_DELAY = 300;

export function useSwipeGesture(
  options: UseSwipeGestureOptions = {},
): UseSwipeGestureReturn {
  const {
    threshold = 100,
    onSwipeRight,
    onSwipeLeft,
    onDoubleTap,
    isCompleted = false,
  } = options;

  const [state, setState] = useState<SwipeState>({
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
    direction: null,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const isMouseDown = useRef(false);
  const lastTapTime = useRef(0);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startX.current = clientX;
    startY.current = clientY;
    setState((prev) => ({ ...prev, isSwiping: false, deltaX: 0, deltaY: 0 }));
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;

    // Only start swiping if horizontal movement exceeds vertical
    const shouldSwipe =
      Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10;

    if (shouldSwipe) {
      setState({
        deltaX,
        deltaY,
        isSwiping: true,
        direction: deltaX > 0 ? "right" : "left",
      });
    }
  }, []);

  const handleEnd = useCallback(() => {
    const { deltaX, isSwiping } = state;

    if (isSwiping) {
      // Swipe right: mark as complete (only if not already completed)
      if (deltaX > threshold && !isCompleted) {
        onSwipeRight?.();
      }
      // Swipe left: mark as incomplete (only if already completed)
      else if (deltaX < -threshold && isCompleted) {
        onSwipeLeft?.();
      }
    }

    // Reset state
    setState({
      deltaX: 0,
      deltaY: 0,
      isSwiping: false,
      direction: null,
    });
    isMouseDown.current = false;
  }, [state, threshold, isCompleted, onSwipeRight, onSwipeLeft]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      onDoubleTap?.();
      lastTapTime.current = 0;
      return true;
    }

    lastTapTime.current = now;
    return false;
  }, [onDoubleTap]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (handleDoubleTap()) {
        e.preventDefault();
        return;
      }
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    },
    [handleStart, handleDoubleTap],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
      if (state.isSwiping) {
        e.preventDefault();
      }
    },
    [handleMove, state.isSwiping],
  );

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isMouseDown.current = true;
      handleStart(e.clientX, e.clientY);
      e.preventDefault();
    },
    [handleStart],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseDown.current) return;
      handleMove(e.clientX, e.clientY);
    },
    [handleMove],
  );

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    if (isMouseDown.current) {
      handleEnd();
    }
  }, [handleEnd]);

  // Calculate transform style based on swipe state
  const style: React.CSSProperties = state.isSwiping
    ? {
        transform: `translateX(${state.deltaX}px)`,
        opacity: 1 - Math.abs(state.deltaX) / 300,
        transition: "none",
      }
    : {
        transform: "translateX(0)",
        opacity: 1,
        transition: "transform 0.3s, opacity 0.3s",
      };

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
    },
    state,
    style,
  };
}
