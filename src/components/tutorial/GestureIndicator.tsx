/**
 * GestureIndicator Component
 *
 * Animated visual hints that show users which gesture to perform.
 * Uses Lucide icons for consistent, well-designed hand gestures.
 *
 * Icons from Lucide (https://lucide.dev):
 * - hand-grab: Grabbing hand for swipe/drag gestures
 * - pointer: Pointing finger for tap gestures
 */

"use client";

type GestureType = "swipe-right" | "swipe-left" | "double-tap" | "none";

interface GestureIndicatorProps {
  gesture: GestureType;
  className?: string;
}

/**
 * Lucide "pointer" icon - pointing finger for tap gestures
 * Source: https://lucide.dev/icons/pointer
 */
function PointerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 14a8 8 0 0 1-8 8" />
      <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
      <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

/**
 * Lucide "hand" icon with white background - open hand
 * Source: https://lucide.dev/icons/hand
 */
function HandOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* White circle background to block text */}
      <circle cx="12" cy="12" r="11" fill="white" stroke="none" />
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

/**
 * Lucide "hand-grab" icon with white background - grabbing/closed hand
 * Source: https://lucide.dev/icons/hand-grab
 */
function HandGrabIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* White circle background to block text */}
      <circle cx="12" cy="12" r="11" fill="white" stroke="none" />
      <path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4" />
      <path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
      <path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5" />
      <path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8a2 2 0 1 1 4 0" />
    </svg>
  );
}

export function GestureIndicator({
  gesture,
  className = "",
}: GestureIndicatorProps) {
  if (gesture === "none") return null;

  if (gesture === "double-tap") {
    return (
      <div
        className={`absolute inset-0 pointer-events-none flex items-center justify-center z-20 ${className}`}
      >
        {/* Pulsing tap indicator - centered container */}
        <div className="relative flex items-center justify-center w-16 h-16">
          {/* Ripple effects - centered */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-tap-ripple opacity-60" />
          <div className="absolute inset-2 rounded-full border-2 border-blue-500 animate-tap-ripple-delayed opacity-80" />
          {/* White background circle */}
          <div className="absolute w-12 h-12 bg-white rounded-full" />
          {/* Tapping finger - Lucide pointer icon */}
          <div className="relative animate-double-tap">
            <PointerIcon className="w-10 h-10 text-blue-600 drop-shadow-md" />
          </div>
          {/* x2 label */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-600 bg-white/90 px-1.5 py-0.5 rounded shadow-sm">
            ×2
          </div>
        </div>
      </div>
    );
  }

  // Swipe indicators - gesture direction is physical, not affected by locale
  const isSwipeRight = gesture === "swipe-right";

  // Animation direction matches the physical gesture
  const dragClass = isSwipeRight
    ? "animate-swipe-drag-right"
    : "animate-swipe-drag-left";

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex items-center justify-center z-20 ${className}`}
    >
      {/* Container that moves during drag */}
      <div className={`relative flex items-center ${dragClass}`}>
        {/* Arrow on the LEFT side when dragging LEFT (leading the direction) */}
        {!isSwipeRight && (
          <svg
            className="w-6 h-6 text-blue-500 mr-1 rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}

        {/* Hand icons container - crossfade between open and grab */}
        <div className="relative w-12 h-12">
          {/* Open hand - visible at start, fades out */}
          <HandOpenIcon className="absolute inset-0 w-12 h-12 text-blue-600 drop-shadow-lg animate-hand-open" />
          {/* Grab hand - fades in after open hand */}
          <HandGrabIcon className="absolute inset-0 w-12 h-12 text-blue-600 drop-shadow-lg animate-hand-grab" />
        </div>

        {/* Arrow on the RIGHT side when dragging RIGHT (leading the direction) */}
        {isSwipeRight && (
          <svg
            className="w-6 h-6 text-blue-500 ml-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
