"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface HeaderProps {
  onSettingsClick: () => void;
  onCalendarClick: () => void;
  onInstallClick?: () => void;
  showInstallButton?: boolean;
  isViewingOtherDate?: boolean;
}

export function Header({
  onSettingsClick,
  onCalendarClick,
  onInstallClick,
  showInstallButton = false,
  isViewingOtherDate = false,
}: HeaderProps) {
  const t = useTranslations("app");
  const [datePickerValue, setDatePickerValue] = useState("");

  const headerBg = isViewingOtherDate
    ? "bg-gradient-to-br from-red-600 to-red-700"
    : "bg-gradient-to-br from-blue-600 to-blue-700";

  return (
    <header
      className={`${headerBg} text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-[101] transition-colors duration-300`}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="rounded-lg"
        />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
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
          aria-label="בחר תאריך"
        />

        {/* Install button */}
        {showInstallButton && onInstallClick && (
          <button
            onClick={onInstallClick}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors"
            aria-label="התקן אפליקציה"
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

        {/* Calendar button */}
        <button
          onClick={onCalendarClick}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors"
          aria-label="בחר תאריך"
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
          onClick={onSettingsClick}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors"
          aria-label="הגדרות"
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
    </header>
  );
}
