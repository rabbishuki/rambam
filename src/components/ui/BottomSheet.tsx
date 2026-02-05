"use client";

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

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
        className="fixed bottom-0 left-0 right-0 z-[999] bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-hidden animate-slide-up"
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-2 border-b border-gray-200">
            <h2
              id="sheet-title"
              className="text-lg font-semibold text-gray-900"
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
