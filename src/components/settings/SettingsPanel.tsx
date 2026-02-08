"use client";

import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/stores/appStore";
import { useLocationStore, formatSunsetTime } from "@/stores/locationStore";
import { getLocationWithName } from "@/services/geocoding";
import { fetchSunset } from "@/services/hebcal";
import {
  downloadExport,
  parseImportFile,
  importData,
} from "@/services/dataExport";
import { getDatabaseStats, clearTextCache } from "@/services/database";
import { getLocalDate } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { MultiPathPicker } from "./MultiPathPicker";
import { PrefetchButton } from "./PrefetchButton";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTutorial } from "@/hooks/useTutorial";
import { CHANGELOG, CONTRIBUTORS } from "@/config/changelog";
import { THEMES } from "@/config/themes";
import type {
  ThemeId,
  CardStyle,
  ContentWidth,
  HideCompletedMode,
} from "@/types";

// ─── Helper components ───────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      dir="ltr"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked
          ? "bg-[var(--color-primary)]"
          : "bg-[var(--color-surface-border)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--color-text-muted)] flex-shrink-0"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function Chevron({ expanded, isRTL }: { expanded: boolean; isRTL: boolean }) {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 7 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--color-text-muted)] transition-transform ${
        expanded ? "rotate-90" : isRTL ? "rotate-180" : ""
      }`}
    >
      <path d="M1 1l5 5-5 5" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SettingsGroup({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div>
      <h3
        className={`text-xs font-semibold px-4 mb-2 ${
          danger ? "text-red-500" : "text-[var(--color-primary)]"
        }`}
      >
        {title}
      </h3>
      <div
        className={`rounded-xl border divide-y ${
          danger
            ? "bg-red-50 border-red-200 divide-red-200"
            : "bg-[var(--color-surface)] border-[var(--color-surface-border)] divide-[var(--color-surface-border)]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  chevron = false,
  onClick,
  control,
  children,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  onClick?: () => void;
  control?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const isExpanded = children != null && children !== false;

  return (
    <div>
      <div
        className={`px-4 py-3 flex items-center justify-between gap-3 ${
          onClick ? "cursor-pointer active:bg-[var(--color-surface-hover)]" : ""
        }`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {control}
          {value && (
            <span className="text-sm text-[var(--color-text-secondary)]">
              {value}
            </span>
          )}
          {chevron && <Chevron expanded={isExpanded} isRTL={locale === "he"} />}
        </div>
      </div>
      {children ? <div className="px-4 pb-3">{children}</div> : null}
    </div>
  );
}

// ─── Main component ──────────────────────────────

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tMessages = useTranslations("messages");
  const router = useRouter();
  const pathname = usePathname();
  const isHebrew = locale === "he";

  const studyPath = useAppStore((state) => state.studyPath);
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const textLanguage = useAppStore((state) => state.textLanguage);
  const autoMarkPrevious = useAppStore((state) => state.autoMarkPrevious);
  const hideCompleted = useAppStore((state) => state.hideCompleted);
  const daysAhead = useAppStore((state) => state.daysAhead);
  const theme = useAppStore((state) => state.theme) as ThemeId;
  const cardStyle = useAppStore((state) => state.cardStyle) as CardStyle;
  const contentWidth = useAppStore(
    (state) => state.contentWidth,
  ) as ContentWidth;
  const setTextLanguage = useAppStore((state) => state.setTextLanguage);
  const setAutoMarkPrevious = useAppStore((state) => state.setAutoMarkPrevious);
  const setHideCompleted = useAppStore((state) => state.setHideCompleted);
  const setDaysAhead = useAppStore((state) => state.setDaysAhead);
  const setTheme = useAppStore((state) => state.setTheme);
  const setCardStyle = useAppStore((state) => state.setCardStyle);
  const setContentWidth = useAppStore((state) => state.setContentWidth);
  const textRetentionDays = useAppStore((state) => state.textRetentionDays);
  const setTextRetentionDays = useAppStore(
    (state) => state.setTextRetentionDays,
  );
  const resetPath = useAppStore((state) => state.resetPath);
  const resetAll = useAppStore((state) => state.resetAll);

  const cityName = useLocationStore((state) => state.cityName);
  const isDefault = useLocationStore((state) => state.isDefault);
  const sunset = useLocationStore((state) => state.sunset);
  const updatedAt = useLocationStore((state) => state.updatedAt);
  const setLocation = useLocationStore((state) => state.setLocation);
  const setSunset = useLocationStore((state) => state.setSunset);

  // Relative time for last location update
  const lastUpdatedLabel = useMemo(() => {
    if (!updatedAt) return null;
    const diff = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return isHebrew ? "עכשיו" : "just now";
    if (minutes < 60)
      return isHebrew ? `לפני ${minutes} דק׳` : `${minutes}m ago`;
    if (hours < 24) return isHebrew ? `לפני ${hours} שע׳` : `${hours}h ago`;
    return isHebrew ? `לפני ${days} ימים` : `${days}d ago`;
  }, [updatedAt, isHebrew]);

  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const [storageStats, setStorageStats] = useState<{
    doneCount: number;
    bookmarksCount: number;
    summariesCount: number;
    daysCount: number;
    lsSize: number;
    textsCount: number;
    calendarCount: number;
    totalEstimate: number;
  } | null>(null);

  const toggleExpand = (key: string) =>
    setExpanded((prev) => (prev === key ? null : key));

  // Tutorial
  const { resetTutorial, isActive, showWhatsNew, hasNewStages } = useTutorial();

  // Load storage stats when expanded
  const loadStorageStats = useCallback(async () => {
    try {
      const state = useAppStore.getState();
      const doneCount = Object.keys(state.done).length;
      const bookmarksCount = Object.keys(state.bookmarks).length;
      const summariesCount = Object.keys(state.summaries).length;
      let daysCount = 0;
      for (const pathDays of Object.values(state.days)) {
        daysCount += Object.keys(pathDays).length;
      }

      const lsItem = localStorage.getItem("rambam-app-storage") || "";
      const lsSize = new Blob([lsItem]).size;

      let textsCount = 0,
        calendarCount = 0;
      try {
        const dbStats = await getDatabaseStats();
        textsCount = dbStats.textsCount;
        calendarCount = dbStats.calendarCount;
      } catch {
        // IndexedDB may not be available
      }

      let totalEstimate = lsSize;
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          if (est.usage) totalEstimate = est.usage;
        }
      } catch {
        // Fallback to localStorage size
      }

      setStorageStats({
        doneCount,
        bookmarksCount,
        summariesCount,
        daysCount,
        lsSize,
        textsCount,
        calendarCount,
        totalEstimate,
      });
    } catch {
      // Silent failure
    }
  }, []);

  useEffect(() => {
    if (expanded === "storage") {
      loadStorageStats();
    }
  }, [expanded, loadStorageStats]);

  // Switch UI language (locale)
  const handleSwitchLocale = useCallback(() => {
    const newLocale = isHebrew ? "en" : "he";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }, [isHebrew, locale, pathname, router]);

  const handleUpdateLocation = useCallback(async () => {
    setIsUpdatingLocation(true);
    try {
      const location = await getLocationWithName();
      setLocation(
        location.coords,
        location.cityName,
        false,
        location.isDefault,
      );
      const today = getLocalDate();
      const sunsetData = await fetchSunset(today, location.coords);
      setSunset(sunsetData);
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [setLocation, setSunset]);

  const { confirm } = useConfirmDialog();

  const handleExport = useCallback(() => {
    downloadExport();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportStatus("idle");

      try {
        const data = await parseImportFile(file);
        importData(data);
        setImportStatus("success");
        setTimeout(() => setImportStatus("idle"), 3000);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 5000);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [],
  );

  const handleResetPath = useCallback(async () => {
    const confirmed = await confirm({
      message: tMessages("confirmResetPath"),
      variant: "danger",
    });
    if (confirmed) {
      resetPath(studyPath);
    }
  }, [resetPath, studyPath, tMessages, confirm]);

  const handleResetAll = useCallback(async () => {
    const confirmed = await confirm({
      message: tMessages("confirmResetAll"),
      variant: "danger",
    });
    if (confirmed) {
      resetAll();
    }
  }, [resetAll, tMessages, confirm]);

  const handleClearCache = useCallback(async () => {
    const confirmed = await confirm({
      message: t("storage.clearCacheConfirm"),
      variant: "danger",
    });
    if (confirmed) {
      try {
        await clearTextCache();
        // Also strip texts from Zustand so PrefetchButton reflects cache state
        useAppStore.getState().clearTextsFromDays();
        await loadStorageStats();
      } catch {
        // Silent failure
      }
    }
  }, [confirm, t, loadStorageStats]);

  const handleSendFeedback = useCallback(async () => {
    if (!feedbackText.trim() || feedbackStatus === "sending") return;
    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackText.trim(),
          locale,
          studyPath,
          theme,
          cardStyle,
          textLanguage,
          hideCompleted,
          activePaths,
        }),
      });
      if (res.ok) {
        setFeedbackStatus("success");
        setFeedbackText("");
        setTimeout(() => setFeedbackStatus("idle"), 3000);
      } else {
        setFeedbackStatus("error");
        setTimeout(() => setFeedbackStatus("idle"), 5000);
      }
    } catch {
      setFeedbackStatus("error");
      setTimeout(() => setFeedbackStatus("idle"), 5000);
    }
  }, [
    feedbackText,
    feedbackStatus,
    locale,
    studyPath,
    theme,
    cardStyle,
    textLanguage,
    hideCompleted,
    activePaths,
  ]);

  const locationSuffix = isDefault
    ? isHebrew
      ? " (ברירת מחדל)"
      : " (default)"
    : "";
  const displayCityName = isHebrew ? cityName.he : cityName.en;

  // Display labels for current values
  const pathLabels: Record<string, string> = {
    rambam3: isHebrew ? "ג' פרקים" : "3 Chapters",
    rambam1: isHebrew ? "פרק אחד" : "1 Chapter",
    mitzvot: isHebrew ? "ספר המצוות" : "Sefer HaMitzvot",
  };

  const textLangLabels: Record<string, string> = {
    hebrew: isHebrew ? "עברית" : "Hebrew",
    english: isHebrew ? "אנגלית" : "English",
    both: isHebrew ? "שניהם" : "Both",
  };

  const hideCompletedLabels: Record<string, string> = {
    show: t("hideCompletedOptions.show"),
    immediate: t("hideCompletedOptions.immediate"),
    after1h: t("hideCompletedOptions.after1h"),
    after24h: t("hideCompletedOptions.after24h"),
  };

  // Theme picker data — swatch is the representative color for the circle
  // Row 1: warm→cool, Row 2: greens + neutrals
  const themeOptions: { id: ThemeId; label: string; swatch: string }[] = [
    { id: "coral", label: isHebrew ? "אלמוג" : "Coral", swatch: "#ea580c" },
    { id: "amber", label: isHebrew ? "ענבר" : "Amber", swatch: "#d97706" },
    { id: "rose", label: isHebrew ? "ורוד" : "Rose", swatch: "#e11d48" },
    {
      id: "lavender",
      label: isHebrew ? "לבנדר" : "Lavender",
      swatch: "#7c3aed",
    },
    { id: "sky", label: isHebrew ? "שמיים" : "Sky", swatch: "#0284c7" },
    { id: "teal", label: isHebrew ? "טורקיז" : "Teal", swatch: "#0d9488" },
    { id: "sage", label: isHebrew ? "מרווה" : "Sage", swatch: "#16a34a" },
    { id: "light", label: isHebrew ? "בהיר" : "Light", swatch: "#ffffff" },
    { id: "dark", label: isHebrew ? "כהה" : "Dark", swatch: "#1e3a5f" },
    { id: "oled", label: "OLED", swatch: "#000000" },
  ];

  // Latest changelog version
  const latestVersion = Object.keys(CHANGELOG).sort(
    (a, b) => parseInt(b) - parseInt(a),
  )[0];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[999] transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 w-full max-w-[400px] h-full bg-[var(--color-surface-hover)] shadow-xl z-[1000] flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-border)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isHebrew ? "הגדרות" : "Settings"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-2xl"
            aria-label={isHebrew ? "סגור" : "Close"}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* ── Appearance ── */}
          <SettingsGroup title={isHebrew ? "מראה" : "Appearance"}>
            {/* Theme picker */}
            <SettingRow
              label={isHebrew ? "ערכת נושא" : "Theme"}
              chevron
              onClick={() => toggleExpand("theme")}
            >
              {expanded === "theme" && (
                <div className="grid grid-cols-5 gap-3 pt-1">
                  {themeOptions.map((opt) => {
                    const isSelected = theme === opt.id;
                    const needsBorder =
                      opt.swatch === "#ffffff" || opt.swatch === "#000000";
                    return (
                      <button
                        key={opt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(opt.id);
                        }}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`w-9 h-9 rounded-full transition-all ${
                            isSelected
                              ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110"
                              : ""
                          } ${needsBorder ? "border border-[var(--color-surface-border)]" : ""}`}
                          style={{ backgroundColor: opt.swatch }}
                        />
                        <span
                          className={`text-[10px] leading-none ${isSelected ? "text-[var(--color-primary)] font-semibold" : "text-[var(--color-text-muted)]"}`}
                        >
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </SettingRow>

            {/* Card style */}
            <SettingRow
              label={isHebrew ? "סגנון כרטיסים" : "Card Style"}
              chevron
              onClick={() => toggleExpand("cardStyle")}
            >
              {expanded === "cardStyle" && (
                <Toggle
                  options={[
                    {
                      value: "list" as const,
                      label: isHebrew ? "רשימה" : "List",
                    },
                    {
                      value: "cards" as const,
                      label: isHebrew ? "כרטיסים" : "Cards",
                    },
                  ]}
                  value={cardStyle}
                  onChange={(val) => setCardStyle(val as CardStyle)}
                />
              )}
            </SettingRow>

            {/* Content width */}
            <SettingRow
              label={isHebrew ? "רוחב תוכן" : "Content Width"}
              chevron
              onClick={() => toggleExpand("contentWidth")}
            >
              {expanded === "contentWidth" && (
                <Toggle
                  options={[
                    {
                      value: "narrow" as const,
                      label: isHebrew ? "צר" : "Narrow",
                    },
                    {
                      value: "medium" as const,
                      label: isHebrew ? "בינוני" : "Medium",
                    },
                    {
                      value: "full" as const,
                      label: isHebrew ? "מלא" : "Full",
                    },
                  ]}
                  value={contentWidth}
                  onChange={(val) => setContentWidth(val as ContentWidth)}
                />
              )}
            </SettingRow>
          </SettingsGroup>

          {/* ── Study ── */}
          <SettingsGroup title={isHebrew ? "לימוד" : "Study"}>
            <SettingRow
              label={isHebrew ? "מסלולי לימוד" : "Study Paths"}
              value={activePaths
                .map((p) => pathLabels[p])
                .filter(Boolean)
                .join(", ")}
              chevron
              onClick={() => toggleExpand("paths")}
            >
              {expanded === "paths" && <MultiPathPicker />}
            </SettingRow>

            <SettingRow
              label={t("textLanguage")}
              value={textLangLabels[textLanguage]}
              chevron
              onClick={() => toggleExpand("textLang")}
            >
              {expanded === "textLang" && (
                <Toggle
                  options={[
                    {
                      value: "hebrew",
                      label: isHebrew ? "עברית" : "Hebrew",
                    },
                    {
                      value: "english",
                      label: isHebrew ? "אנגלית" : "English",
                    },
                    { value: "both", label: isHebrew ? "שניהם" : "Both" },
                  ]}
                  value={textLanguage}
                  onChange={setTextLanguage}
                />
              )}
            </SettingRow>

            <SettingRow
              label={t("startDate")}
              value={isHebrew ? "מחזור 46 · ט״ו שבט" : "Cycle 46 · 15 Shevat"}
            />
          </SettingsGroup>

          {/* ── Behavior ── */}
          <SettingsGroup title={isHebrew ? "התנהגות" : "Behavior"}>
            <SettingRow
              label={t("autoMark")}
              value={
                autoMarkPrevious
                  ? isHebrew
                    ? "פעיל"
                    : "On"
                  : isHebrew
                    ? "כבוי"
                    : "Off"
              }
              chevron
              onClick={() => toggleExpand("autoMark")}
            >
              {expanded === "autoMark" && (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {isHebrew
                      ? "כשמסמנים הלכה כנקראה, כל ההלכות הקודמות שלא סומנו יסומנו גם כן באופן אוטומטי."
                      : "When marking a halakha as read, all previous unmarked halakhot will be automatically marked as well."}
                  </p>
                  <ToggleSwitch
                    checked={autoMarkPrevious}
                    onChange={setAutoMarkPrevious}
                  />
                </div>
              )}
            </SettingRow>

            <SettingRow
              label={t("hideCompleted")}
              value={hideCompletedLabels[hideCompleted]}
              chevron
              onClick={() => toggleExpand("hide")}
            >
              {expanded === "hide" && (
                <select
                  value={hideCompleted}
                  onChange={(e) =>
                    setHideCompleted(e.target.value as HideCompletedMode)
                  }
                  className="w-full p-2.5 border border-[var(--color-surface-border)] rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="show">{t("hideCompletedOptions.show")}</option>
                  <option value="immediate">
                    {t("hideCompletedOptions.immediate")}
                  </option>
                  <option value="after1h">
                    {t("hideCompletedOptions.after1h")}
                  </option>
                  <option value="after24h">
                    {t("hideCompletedOptions.after24h")}
                  </option>
                </select>
              )}
            </SettingRow>

            <SettingRow
              label={isHebrew ? "שפת הממשק" : "Interface Language"}
              value={isHebrew ? "עברית" : "English"}
              chevron
              onClick={() => toggleExpand("locale")}
            >
              {expanded === "locale" && (
                <Toggle
                  options={[
                    { value: "he", label: "עברית" },
                    { value: "en", label: "English" },
                  ]}
                  value={locale}
                  onChange={(val) => {
                    if (val !== locale) handleSwitchLocale();
                  }}
                />
              )}
            </SettingRow>
          </SettingsGroup>

          {/* ── Device & Data ── */}
          <SettingsGroup title={isHebrew ? "מכשיר ומידע" : "Device & Data"}>
            <SettingRow
              label={isHebrew ? "מיקום ושקיעה" : "Location & Sunset"}
              value={displayCityName + locationSuffix}
              chevron
              onClick={() => toggleExpand("location")}
            >
              {expanded === "location" && (
                <div className="space-y-2">
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {t("sunsetLabel")}: {formatSunsetTime(sunset)}
                    {lastUpdatedLabel && (
                      <span className="mx-1">
                        • {isHebrew ? "עודכן" : "updated"} {lastUpdatedLabel}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleUpdateLocation}
                    disabled={isUpdatingLocation}
                  >
                    {isUpdatingLocation ? t("updating") : t("updateLocation")}
                  </Button>
                </div>
              )}
            </SettingRow>

            <SettingRow
              label={isHebrew ? "הורדה אופליין" : "Offline Download"}
              chevron
              onClick={() => toggleExpand("offline")}
            >
              {expanded === "offline" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                      {t("daysAheadLabel")}: {daysAhead}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={14}
                      value={daysAhead}
                      onChange={(e) => setDaysAhead(parseInt(e.target.value))}
                      className="w-full accent-[var(--color-primary)]"
                    />
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-0.5">
                      <span>14</span>
                      <span>7</span>
                      <span>1</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                      {t("daysAheadHint")}
                    </p>
                  </div>
                  <PrefetchButton />
                </div>
              )}
            </SettingRow>

            <SettingRow
              label={t("textRetention")}
              value={t(`textRetentionOptions.${textRetentionDays}`)}
              chevron
              onClick={() => toggleExpand("textRetention")}
            >
              {expanded === "textRetention" && (
                <div className="space-y-2">
                  <select
                    value={textRetentionDays}
                    onChange={(e) =>
                      setTextRetentionDays(parseInt(e.target.value))
                    }
                    className="w-full p-2.5 border border-[var(--color-surface-border)] rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value={7}>{t("textRetentionOptions.7")}</option>
                    <option value={14}>{t("textRetentionOptions.14")}</option>
                    <option value={30}>{t("textRetentionOptions.30")}</option>
                    <option value={0}>{t("textRetentionOptions.0")}</option>
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("textRetentionHint")}
                  </p>
                </div>
              )}
            </SettingRow>

            <SettingRow
              label={isHebrew ? "ייצוא / ייבוא" : "Export / Import"}
              chevron
              onClick={() => toggleExpand("data")}
            >
              {expanded === "data" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleExport}
                    >
                      {t("exportData")}
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t("importData")}
                      </Button>
                    </div>
                  </div>
                  {importStatus === "success" && (
                    <p className="text-xs text-green-600 text-center">
                      {t("importSuccess")}
                    </p>
                  )}
                  {importStatus === "error" && (
                    <p className="text-xs text-red-600 text-center">
                      {t("importError")}
                    </p>
                  )}
                </div>
              )}
            </SettingRow>
          </SettingsGroup>

          {/* ── About ── */}
          <SettingsGroup title={isHebrew ? "אודות" : "About"}>
            {/* Tutorial */}
            {!isActive && (
              <SettingRow
                label={isHebrew ? "מדריך" : "Tutorial"}
                chevron
                onClick={() => toggleExpand("tutorial")}
              >
                {expanded === "tutorial" && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        resetTutorial();
                        onClose();
                      }}
                    >
                      {t("restartTutorial")}
                    </Button>
                    {hasNewStages && (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => {
                          showWhatsNew();
                          onClose();
                        }}
                      >
                        {t("showWhatsNew")}
                      </Button>
                    )}
                  </div>
                )}
              </SettingRow>
            )}

            {/* Changelog */}
            <SettingRow
              label={isHebrew ? "יומן שינויים" : "Changelog"}
              value={`v${latestVersion}`}
              chevron
              onClick={() => toggleExpand("changelog")}
            >
              {expanded === "changelog" && (
                <div className="space-y-2 pt-1">
                  {Object.entries(CHANGELOG)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([version, changes]) => {
                      const contributor = CONTRIBUTORS[version];
                      return (
                        <details
                          key={version}
                          className="border border-[var(--color-surface-border)] rounded-lg overflow-hidden"
                          open={version === latestVersion}
                        >
                          <summary className="px-3 py-2 bg-[var(--color-surface-hover)] font-semibold text-sm cursor-pointer hover:bg-[var(--color-surface-border)]/50 flex items-center gap-2 text-[var(--color-text-primary)]">
                            <span className="inline-block transition-transform text-xs">
                              {isHebrew ? "◀" : "▶"}
                            </span>
                            <span className="flex-1">
                              {t("version")} {version}
                            </span>
                            {contributor && (
                              <Image
                                src={contributor.avatar}
                                alt={
                                  isHebrew
                                    ? contributor.name.he
                                    : contributor.name.en
                                }
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            )}
                          </summary>
                          <div className="p-3 bg-[var(--color-surface)]">
                            {changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="py-1 text-sm text-[var(--color-text-secondary)] border-b border-[var(--color-surface-border)] last:border-0"
                                dir={isHebrew ? "rtl" : "ltr"}
                              >
                                <span
                                  className={`text-[var(--color-primary)] font-bold ${isHebrew ? "ml-1" : "mr-1"}`}
                                >
                                  •
                                </span>
                                {isHebrew ? change.he : change.en}
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                </div>
              )}
            </SettingRow>

            {/* Credits */}
            <SettingRow
              label={isHebrew ? "קרדיטים" : "Credits"}
              chevron
              onClick={() => toggleExpand("credits")}
            >
              {expanded === "credits" && (
                <div className="flex flex-col gap-2 pt-1">
                  {/* Rambam */}
                  <a
                    href={
                      isHebrew
                        ? "https://he.chabad.org/library/article_cdo/aid/5783107"
                        : "https://www.chabad.org/library/article_cdo/aid/75991/jewish/Maimonides-His-Life-and-Works.htm"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src="/contributors/rambam.webp"
                      alt="Rambam"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {isHebrew ? 'הרמב"ם' : "The Rambam"}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew
                          ? "בזכותו אנחנו כאן"
                          : "By his merit we are here"}
                      </div>
                    </div>
                    <ExternalLinkIcon />
                  </a>

                  {/* Rabbi Shuki */}
                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Image
                      src="/contributors/rabbi.jpeg"
                      alt="Rabbi Shuki"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {isHebrew ? "הרב שוקי" : "Rabbi Shuki"}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew ? "הגה והכווין" : "Conceived & directed"}
                      </div>
                    </div>
                  </div>

                  {/* Meir */}
                  <a
                    href="https://meir.pro/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src="/contributors/meir.webp"
                      alt="Meir"
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {isHebrew ? "מאיר" : "Meir"}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew ? "שודרג עם ❤️" : "Upgraded with ❤️"}
                      </div>
                    </div>
                    <ExternalLinkIcon />
                  </a>

                  {/* Claude Code */}
                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <Image
                      src="/contributors/claude.jpeg"
                      alt="Claude Code"
                      width={36}
                      height={36}
                      className="rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        Claude Code
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew ? "כתב את הקוד" : "Wrote the code"}
                      </div>
                    </div>
                  </div>

                  {/* Sefaria */}
                  <a
                    href="https://www.sefaria.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src="/contributors/sefaria.png"
                      alt="Sefaria"
                      width={36}
                      height={36}
                      className="rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        Sefaria
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew ? "הטקסטים מבית ספריא" : "Texts from Sefaria"}
                      </div>
                    </div>
                    <ExternalLinkIcon />
                  </a>

                  {/* Hebcal */}
                  <a
                    href="https://www.hebcal.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src="/contributors/hebcal.png"
                      alt="Hebcal"
                      width={36}
                      height={36}
                      className="rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        Hebcal
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {isHebrew ? "לוח שנה עברי" : "Hebrew calendar"}
                      </div>
                    </div>
                    <ExternalLinkIcon />
                  </a>
                </div>
              )}
            </SettingRow>
          </SettingsGroup>

          {/* ── Feedback ── */}
          <SettingsGroup title={t("feedback.title")}>
            <SettingRow
              label={t("feedback.sendFeedback")}
              chevron
              onClick={() => toggleExpand("feedback")}
            >
              {expanded === "feedback" && (
                <div className="space-y-2">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) {
                        setFeedbackText(e.target.value);
                      }
                    }}
                    placeholder={t("feedback.placeholder")}
                    rows={3}
                    className="w-full p-2.5 border border-[var(--color-surface-border)] rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                    dir="auto"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("feedback.charCount", { count: feedbackText.length })}
                    </span>
                    <div className="flex items-center gap-2">
                      {feedbackStatus === "success" && (
                        <span className="text-xs text-green-600">
                          {t("feedback.success")}
                        </span>
                      )}
                      {feedbackStatus === "error" && (
                        <span className="text-xs text-red-600">
                          {t("feedback.error")}
                        </span>
                      )}
                      <Button
                        variant="primary"
                        onClick={handleSendFeedback}
                        disabled={
                          !feedbackText.trim() || feedbackStatus === "sending"
                        }
                      >
                        {feedbackStatus === "sending"
                          ? t("feedback.sending")
                          : t("feedback.send")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </SettingRow>

            <SettingRow
              label={t("feedback.suggestions")}
              control={<ExternalLinkIcon />}
              onClick={() =>
                window.open(
                  isHebrew
                    ? "https://docs.google.com/forms/d/1ulOxIcV7V2adATV1wDqRggWUfkwoDIvMGTMKvsJQdh8/viewform"
                    : "https://docs.google.com/forms/d/1qp7eh1fyrkJUG2rrrC5aWnhKGjLsUXvdyFhWDBs0-DU/viewform",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            />
          </SettingsGroup>

          {/* ── Danger Zone ── */}
          <SettingsGroup title={isHebrew ? "אזור מסוכן" : "Danger Zone"} danger>
            {/* Storage Usage */}
            <div>
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-red-100"
                onClick={() => toggleExpand("storage")}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
                  <svg
                    width="7"
                    height="12"
                    viewBox="0 0 7 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${
                      expanded === "storage"
                        ? "rotate-90"
                        : isHebrew
                          ? "rotate-180"
                          : ""
                    }`}
                  >
                    <path d="M1 1l5 5-5 5" />
                  </svg>
                  <span>{t("storage.title")}</span>
                </div>
                {storageStats && (
                  <span className="text-xs text-red-400 font-mono tabular-nums">
                    {formatBytes(storageStats.totalEstimate)}
                  </span>
                )}
              </div>
              {expanded === "storage" && (
                <div className="px-4 pb-3">
                  {storageStats ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.completionRecords")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.doneCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.bookmarks")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.bookmarksCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.summaries")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.summariesCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.dayMetadata")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.daysCount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-red-200 pt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.textCache")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.textsCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.calendarCache")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {storageStats.calendarCount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-red-200 pt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">
                            {t("storage.settingsProgress")}
                          </span>
                          <span className="text-red-600 font-mono tabular-nums">
                            {formatBytes(storageStats.lsSize)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-red-600">
                            {t("storage.total")}
                          </span>
                          <span className="text-red-700 font-mono tabular-nums">
                            {formatBytes(storageStats.totalEstimate)}
                          </span>
                        </div>
                      </div>

                      {(storageStats.textsCount > 0 ||
                        storageStats.calendarCount > 0) && (
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={handleClearCache}
                        >
                          {t("storage.clearCache")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-red-400 text-center py-1">
                      {isHebrew ? "טוען..." : "Loading..."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reset options */}
            <div>
              <div
                className="px-4 py-3 flex items-center gap-2 cursor-pointer text-red-500 font-medium text-sm active:bg-red-100"
                onClick={() => toggleExpand("danger")}
                role="button"
                tabIndex={0}
              >
                <svg
                  width="7"
                  height="12"
                  viewBox="0 0 7 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${
                    expanded === "danger"
                      ? "rotate-90"
                      : isHebrew
                        ? "rotate-180"
                        : ""
                  }`}
                >
                  <path d="M1 1l5 5-5 5" />
                </svg>
                <span>
                  {isHebrew ? "הצג אפשרויות איפוס" : "Show reset options"}
                </span>
              </div>
              {expanded === "danger" && (
                <div className="px-4 pb-3 pt-1">
                  <p className="text-sm text-[var(--color-text-muted)] text-center mb-2">
                    ⚠️ {t("resetWarning")}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={handleResetPath}
                    >
                      {t("resetPath")}
                    </Button>
                    <Button variant="danger" fullWidth onClick={handleResetAll}>
                      {t("resetAll")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SettingsGroup>
        </div>

        {/* Dedications (always in Hebrew as these are religious dedications) */}
        <div
          className="bg-amber-100 p-3 text-center text-sm text-amber-800 font-medium"
          dir="rtl"
        >
          <div>
            רפואה שלימה ל<strong>מרדכי</strong> בן <strong>חנה</strong>
          </div>
          <div className="mt-1">
            לעילוי נשמת <strong>ישראל שאול</strong> בן{" "}
            <strong>משה אהרון</strong> ו<strong>מלכה</strong> בת{" "}
            <strong>נתן</strong>
          </div>
        </div>

        <div className="bg-[var(--color-primary-dark)] text-white p-2 text-center text-sm font-medium">
          יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד
        </div>
      </div>
    </>
  );
}
