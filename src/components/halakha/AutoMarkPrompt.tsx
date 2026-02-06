"use client";

import { useTranslations } from "next-intl";

export type AutoMarkChoice = "always" | "justOnce" | "onlyThis" | "cancel";

interface AutoMarkPromptProps {
  isOpen: boolean;
  count: number;
  onChoice: (choice: AutoMarkChoice) => void;
}

export function AutoMarkPrompt({
  isOpen,
  count,
  onChoice,
}: AutoMarkPromptProps) {
  const t = useTranslations("autoMarkPrompt");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-sm w-full p-6"
        dir="rtl"
      >
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
          {t("title")}
        </h3>
        <p className="text-[var(--color-text-secondary)] mb-6">
          {t("message", { count })}
        </p>

        <div className="flex flex-col gap-2">
          {/* Always - enables autoMarkPrevious setting */}
          <button
            onClick={() => onChoice("always")}
            className="w-full py-3 px-4 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {t("always")}
          </button>

          {/* Just this time - marks all but doesn't change setting */}
          <button
            onClick={() => onChoice("justOnce")}
            className="w-full py-3 px-4 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-xl font-medium hover:bg-[var(--color-surface-border)] transition-colors"
          >
            {t("justOnce")}
          </button>

          {/* Only this one - marks just current halakha */}
          <button
            onClick={() => onChoice("onlyThis")}
            className="w-full py-3 px-4 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-xl font-medium hover:bg-[var(--color-surface-border)] transition-colors"
          >
            {t("onlyThis")}
          </button>

          {/* Cancel - do nothing */}
          <button
            onClick={() => onChoice("cancel")}
            className="w-full py-2 px-4 text-[var(--color-text-secondary)] font-medium hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
