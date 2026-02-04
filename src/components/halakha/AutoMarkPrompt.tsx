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
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        dir="rtl"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t("title")}</h3>
        <p className="text-gray-600 mb-6">{t("message", { count })}</p>

        <div className="flex flex-col gap-2">
          {/* Always - enables autoMarkPrevious setting */}
          <button
            onClick={() => onChoice("always")}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t("always")}
          </button>

          {/* Just this time - marks all but doesn't change setting */}
          <button
            onClick={() => onChoice("justOnce")}
            className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {t("justOnce")}
          </button>

          {/* Only this one - marks just current halakha */}
          <button
            onClick={() => onChoice("onlyThis")}
            className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {t("onlyThis")}
          </button>

          {/* Cancel - do nothing */}
          <button
            onClick={() => onChoice("cancel")}
            className="w-full py-2 px-4 text-gray-500 font-medium hover:text-gray-700 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
