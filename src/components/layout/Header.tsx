"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useAppStore, countBookmarks } from "@/stores/appStore";
import { BookmarksList } from "@/components/bookmarks";
import { BookmarkIcon } from "@/components/ui/icons/BookmarkIcon";

interface HeaderProps {
  onSettingsClick: () => void;
  onCalendarClick: () => void;
  onInstallClick?: () => void;
  showInstallButton?: boolean;
  isViewingOtherDate?: boolean;
  /** Force default color during tutorial - colors will be taught separately */
  forceDefaultColor?: boolean;
}

export function Header({
  onSettingsClick,
  onCalendarClick,
  onInstallClick,
  showInstallButton = false,
  isViewingOtherDate = false,
  forceDefaultColor = false,
}: HeaderProps) {
  const t = useTranslations("app");
  const tOffline = useTranslations("offline");
  const tAria = useTranslations("aria");
  const tBookmarks = useTranslations("bookmarks");
  const locale = useLocale();
  const isHebrew = locale === "he";
  const [datePickerValue, setDatePickerValue] = useState("");
  const [showOfflineTooltip, setShowOfflineTooltip] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const { isOffline } = useOfflineStatus();

  // Bookmarks count
  const bookmarks = useAppStore((state) => state.bookmarks);
  const bookmarkCount = countBookmarks(bookmarks);

  // Update accent bar color based on state
  // Priority: forceDefaultColor > viewing other date (red) > offline (amber) > normal (theme primary)
  useEffect(() => {
    const accent = forceDefaultColor
      ? "var(--color-status-normal)"
      : isViewingOtherDate
        ? "var(--color-status-other-date)"
        : isOffline
          ? "var(--color-status-offline)"
          : "var(--color-status-normal)";
    document.documentElement.style.setProperty("--header-accent", accent);

    // Also update app-bg for backward compatibility (bookmark count color, etc.)
    const bgColor = forceDefaultColor
      ? "var(--color-primary)"
      : isViewingOtherDate
        ? "var(--color-status-other-date)"
        : isOffline
          ? "var(--color-status-offline)"
          : "var(--color-primary)";
    document.documentElement.style.setProperty("--app-bg", bgColor);
  }, [isViewingOtherDate, isOffline, forceDefaultColor]);

  // Button style: subtle background
  const buttonClasses =
    "w-10 h-10 rounded-full bg-[var(--color-surface-border)]/50 flex items-center justify-center hover:bg-[var(--color-surface-border)] active:bg-[var(--color-surface-border)]/80 transition-colors";

  // Icon color
  const iconColor = "text-[var(--color-text-primary)]";

  return (
    <header
      className="bg-[var(--color-surface)] border-b-[3px] sticky top-0 z-[101] transition-colors duration-300"
      style={{
        borderBottomColor: "var(--header-accent)",
        borderTopWidth:
          isViewingOtherDate && !forceDefaultColor ? "3px" : "0px",
        borderTopColor: "var(--color-status-other-date)",
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={36}
            height={36}
            className={`rounded-lg ${isHebrew ? "" : "-scale-x-100"}`}
          />
          <h1 className={`text-2xl font-bold text-[var(--color-text-primary)]`}>
            {t("title")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden date picker */}
          <input
            type="date"
            value={datePickerValue}
            onChange={(e) => {
              setDatePickerValue(e.target.value);
              onCalendarClick();
            }}
            className="hidden"
            id="headerDatePicker"
            aria-label={tAria("selectDate")}
          />

          {/* Offline indicator */}
          {isOffline && (
            <div className="relative">
              <button
                onClick={() => setShowOfflineTooltip(!showOfflineTooltip)}
                className={`${buttonClasses} ${iconColor}`}
                aria-label={tAria("offlineMode")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                  <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </button>
              {/* Tooltip */}
              {showOfflineTooltip && (
                <>
                  <div
                    className="fixed inset-0 z-[200]"
                    onClick={() => setShowOfflineTooltip(false)}
                  />
                  <div
                    className={`absolute top-12 ${isHebrew ? "right-0" : "left-0"} bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg z-[201] whitespace-nowrap`}
                  >
                    {tOffline("indicator")}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Install button */}
          {showInstallButton && onInstallClick && (
            <button
              onClick={onInstallClick}
              className={`${buttonClasses} ${iconColor}`}
              aria-label={tAria("installApp")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          )}

          {/* Bookmarks button */}
          <button
            onClick={() => setShowBookmarks(true)}
            className={`relative ${buttonClasses} ${iconColor}`}
            aria-label={tBookmarks("title")}
          >
            <BookmarkIcon size={24} filled={bookmarkCount > 0} />
            {bookmarkCount > 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold leading-none pb-1 pointer-events-none text-white">
                {bookmarkCount > 99 ? "99" : bookmarkCount}
              </span>
            )}
          </button>

          {/* Calendar button */}
          <button
            id="calendar-button"
            onClick={onCalendarClick}
            className={`${buttonClasses} ${iconColor}`}
            aria-label={tAria("selectDate")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          {/* Settings button */}
          <button
            id="settings-button"
            onClick={onSettingsClick}
            className={`${buttonClasses} ${iconColor}`}
            aria-label={tAria("settings")}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bookmarks list bottom sheet */}
      <BookmarksList
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
      />
    </header>
  );
}
