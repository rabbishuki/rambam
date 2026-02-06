"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  generateShareContent,
  shareContent,
  canUseWebShare,
} from "@/lib/shareContent";
import { useStats } from "@/hooks/useStats";
import type { StudyPath } from "@/types";

interface ShareButtonProps {
  path: StudyPath;
  date: string;
  summaryText?: string;
  dayTitle?: string;
}

export function ShareButton({
  path,
  date,
  summaryText,
  dayTitle,
}: ShareButtonProps) {
  const locale = useLocale();
  const t = useTranslations("share");
  const { completedDays, totalDays } = useStats();
  const [showCopied, setShowCopied] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleShare = useCallback(async () => {
    const content = generateShareContent({
      path,
      date,
      summaryText,
      dayTitle,
      completedDays,
      totalDays,
      locale,
    });

    const success = await shareContent(content);

    if (success) {
      // Only show "copied" message if we used clipboard (not Web Share)
      if (!canUseWebShare()) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  }, [path, date, summaryText, dayTitle, completedDays, totalDays, locale]);

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {t("share")}
      </button>

      {/* Copied toast */}
      {showCopied && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg whitespace-nowrap shadow-lg animate-fade-in">
          ✓ {t("copied")}
        </div>
      )}

      {/* Error toast */}
      {showError && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap shadow-lg animate-fade-in">
          ✕ {t("shareError")}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, 4px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
