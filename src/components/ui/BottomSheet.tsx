"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const DISMISS_THRESHOLD = 100; // px to drag before dismissing
const VELOCITY_THRESHOLD = 0.5; // px/ms - fast swipe dismisses even if < threshold

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Swipe-to-dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;
      // Only allow dragging down (positive delta)
      setDragY(Math.max(0, delta));
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const elapsed = Date.now() - startTime.current;
    const velocity = dragY / elapsed; // px/ms

    // Dismiss if dragged far enough OR if swiped fast enough
    if (dragY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose();
    }

    // Reset state
    setDragY(0);
    setIsDragging(false);
  }, [isDragging, dragY, onClose]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  // Add/remove event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sheet = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[998] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
        className="fixed bottom-0 left-0 right-0 z-[999] bg-[var(--color-surface)] rounded-t-2xl shadow-xl max-h-[85vh] overflow-hidden animate-slide-up"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar - visual drag indicator */}
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none">
          <div className="w-10 h-1 bg-[var(--color-text-muted)] rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-2 border-b border-[var(--color-surface-border)]">
            <h2
              id="sheet-title"
              className="text-lg font-semibold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {children}
        </div>

        {/* Safe area for iOS */}
        <div className="pb-safe" />
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );

  // Use portal to render at document root
  if (typeof document !== "undefined") {
    return createPortal(sheet, document.body);
  }

  return null;
}
