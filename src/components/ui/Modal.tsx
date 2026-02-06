"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
}: ModalProps) {
  const tAria = useTranslations("aria");

  // Handle escape key (only when close button is shown)
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCloseButton) {
        onClose();
      }
    },
    [onClose, showCloseButton],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[999] transition-opacity"
        onClick={showCloseButton ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-[var(--color-surface)] rounded-xl shadow-xl z-[1000] overflow-hidden"
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-surface-border)]">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xl"
                aria-label={tAria("close")}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </>
  );
}
