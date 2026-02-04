"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/stores/appStore";
import { useLocationStore, formatSunsetTime } from "@/stores/locationStore";
import { getLocationWithName } from "@/services/geocoding";
import { fetchSunset } from "@/services/hebcal";
import { getTodayInIsrael } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { StudyPathPicker } from "./StudyPathPicker";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bilingual changelog - Hebrew and English
const CHANGELOG: Record<string, { he: string; en: string }[]> = {
  "3": [
    {
      he: "מעבר ל-Next.js 16 ו-React 19",
      en: "Migrated to Next.js 16 and React 19",
    },
    {
      he: "אפשרות לבחור בין 3 פרקים או פרק אחד ליום",
      en: "Option to choose between 3 chapters or 1 chapter per day",
    },
    {
      he: "תצוגה דו-לשונית: עברית, אנגלית, או שניהם",
      en: "Bilingual display: Hebrew, English, or both",
    },
    {
      he: "שיפורי ביצועים ואמינות",
      en: "Performance and reliability improvements",
    },
  ],
  "2": [
    {
      he: "כפתור להתקנת האפליקציה למסך הבית",
      en: "Install button to add app to home screen",
    },
    {
      he: "אפשרות לבחור אם לסמן הלכות קודמות אוטומטית או ידנית",
      en: "Option to auto-mark or manually mark previous halakhot",
    },
    {
      he: "גלילה אוטומטית להלכה הבאה לאחר סימון",
      en: "Auto-scroll to next halakha after marking",
    },
  ],
  "1": [
    {
      he: "בחירה בין פרק אחד ל-3 פרקים ליום",
      en: "Choose between 1 or 3 chapters per day",
    },
    {
      he: "לימוד עם המסלול הנוכחי או מהיום והלאה",
      en: "Study with current cycle or start from today",
    },
    {
      he: "תאריכי הלימוד מוצגים בעברית (לדוגמה: י״ז שבט)",
      en: "Hebrew dates displayed (e.g., 17 Shevat)",
    },
    {
      he: "זיהוי שקיעה מדויק על בסיס מיקום",
      en: "Accurate sunset detection based on location",
    },
    {
      he: "אייקון לוח השנה מאפשרת לצפות בכל תאריך ספציפי",
      en: "Calendar icon to view any specific date",
    },
    {
      he: "החלקה ימינה לסימון הלכה, שמאלה לביטול סימון או לחיצה כפולה",
      en: "Swipe right to mark, left to unmark, or double-tap",
    },
    {
      he: "סימון הלכה מתייחס גם לכל ההלכות הקודמות",
      en: "Marking a halakha also marks all previous ones",
    },
    {
      he: "מחיצות בין פרקים - מפריד ויזואלי בין פרק לפרק",
      en: "Visual chapter dividers between sections",
    },
    {
      he: "עדכון אוטומטי של כותרות - ההתקדמות מתעדכנת מיד",
      en: "Auto-updating headers with progress",
    },
  ],
  "0": [
    {
      he: 'אפליקציה לניהול לימוד רמב"ם יומי (3 פרקים)',
      en: "App for managing daily Rambam study (3 chapters)",
    },
    { he: "תמיכה בעברית מלאה מימין לשמאל", en: "Full Hebrew RTL support" },
    {
      he: "החלק הלכה ימינה כדי לסמן כהושלם",
      en: "Swipe halakha right to mark as complete",
    },
    {
      he: "כל המידע נשמר מקומית במכשיר",
      en: "All data saved locally on device",
    },
    {
      he: "התחלת יום עברי בשעה 18:00 שעון ישראל (שקיעה משוערת)",
      en: "Jewish day starts at 18:00 Israel time (estimated sunset)",
    },
    {
      he: "סטטיסטיקות - ימים שלמדתי, אחוז ההתקדמות של היום, הלכות להשלים",
      en: "Statistics - days studied, today's progress, halakhot remaining",
    },
    {
      he: "הגדרות - בחירת תאריך התחלה ואפשרות איפוס",
      en: "Settings - start date selection and reset option",
    },
    {
      he: "חיבור ל-API של ספריא לטעינת התוכן",
      en: "Connected to Sefaria API for content loading",
    },
  ],
};

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tMessages = useTranslations("messages");
  const router = useRouter();
  const pathname = usePathname();
  const isHebrew = locale === "he";

  const studyPath = useAppStore((state) => state.studyPath);
  const textLanguage = useAppStore((state) => state.textLanguage);
  const autoMarkPrevious = useAppStore((state) => state.autoMarkPrevious);
  const setTextLanguage = useAppStore((state) => state.setTextLanguage);
  const setAutoMarkPrevious = useAppStore((state) => state.setAutoMarkPrevious);
  const resetPath = useAppStore((state) => state.resetPath);
  const resetAll = useAppStore((state) => state.resetAll);

  const cityName = useLocationStore((state) => state.cityName);
  const isDefault = useLocationStore((state) => state.isDefault);
  const sunset = useLocationStore((state) => state.sunset);
  const setLocation = useLocationStore((state) => state.setLocation);
  const setSunset = useLocationStore((state) => state.setSunset);

  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Switch UI language (locale)
  const handleSwitchLocale = useCallback(() => {
    const newLocale = isHebrew ? "en" : "he";
    // Replace the locale in the pathname
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

      const today = getTodayInIsrael();
      const sunsetData = await fetchSunset(today, location.coords);
      setSunset(sunsetData);
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setIsUpdatingLocation(false);
    }
  }, [setLocation, setSunset]);

  const handleResetPath = useCallback(() => {
    if (window.confirm(tMessages("confirmResetPath"))) {
      resetPath(studyPath);
    }
  }, [resetPath, studyPath, tMessages]);

  const handleResetAll = useCallback(() => {
    if (window.confirm(tMessages("confirmResetAll"))) {
      resetAll();
    }
  }, [resetAll, tMessages]);

  const locationSuffix = isDefault
    ? isHebrew
      ? " (ברירת מחדל)"
      : " (default)"
    : "";
  const displayCityName = isHebrew ? cityName.he : cityName.en;

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
        className={`fixed top-0 right-0 w-full max-w-[400px] h-full bg-white shadow-xl z-[1000] flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isHebrew ? "הגדרות" : "Settings"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 text-2xl"
            aria-label={isHebrew ? "סגור" : "Close"}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* UI Language Switch */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isHebrew ? "שפת הממשק" : "Interface Language"}
            </label>
            <Button variant="secondary" fullWidth onClick={handleSwitchLocale}>
              {isHebrew ? "🇺🇸 Switch to English" : "🇮🇱 עבור לעברית"}
            </Button>
          </section>

          {/* Study Path */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("studyPath")}
            </label>
            <StudyPathPicker />
          </section>

          {/* Text Language */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("textLanguage")}
            </label>
            <Toggle
              options={[
                { value: "hebrew", label: isHebrew ? "עברית" : "Hebrew" },
                { value: "english", label: isHebrew ? "אנגלית" : "English" },
                { value: "both", label: isHebrew ? "שניהם" : "Both" },
              ]}
              value={textLanguage}
              onChange={setTextLanguage}
            />
          </section>

          {/* Start Date - Static, always Cycle 46 */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("startDate")}
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {t("cycle46")} - {isHebrew ? "ט״ו שבט ה׳תשפ״ו" : "15 Shevat 5786"}{" "}
              (Feb 3, 2026)
            </div>
          </section>

          {/* Auto-mark Previous */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("autoMark")}
            </label>
            <Toggle
              options={[
                { value: "true", label: t("yes") },
                { value: "false", label: t("no") },
              ]}
              value={autoMarkPrevious ? "true" : "false"}
              onChange={(val) => setAutoMarkPrevious(val === "true")}
            />
          </section>

          {/* Location & Sunset */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("location")}
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 mb-2">
              <div>
                {t("locationLabel")}: {displayCityName}
                {locationSuffix}
              </div>
              <div>
                {t("sunsetLabel")}: {formatSunsetTime(sunset)}
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={handleUpdateLocation}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? t("updating") : t("updateLocation")}
            </Button>
          </section>

          {/* Reset */}
          <section className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-2">
              ⚠️ {t("resetWarning")}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" fullWidth onClick={handleResetPath}>
                {t("resetPath")}
              </Button>
              <Button variant="danger" fullWidth onClick={handleResetAll}>
                {t("resetAll")}
              </Button>
            </div>
          </section>

          {/* Changelog - in its own collapsible section */}
          <section className="p-4">
            <details className="border rounded-lg overflow-hidden">
              <summary className="px-3 py-2 bg-gray-100 font-semibold text-sm cursor-pointer hover:bg-gray-200">
                <span
                  className={`inline-block transition-transform ${isHebrew ? "mr-2" : "ml-2"}`}
                >
                  {isHebrew ? "◀" : "▶"}
                </span>
                {t("changelog")}
              </summary>
              <div className="p-3 bg-white">
                {Object.entries(CHANGELOG)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .map(([version, changes]) => (
                    <details
                      key={version}
                      className="mb-2 border rounded-lg overflow-hidden"
                      open={version === "3"}
                    >
                      <summary className="px-3 py-2 bg-gray-50 font-semibold text-sm cursor-pointer hover:bg-gray-100">
                        <span
                          className={`inline-block transition-transform ${isHebrew ? "mr-2" : "ml-2"}`}
                        >
                          {isHebrew ? "◀" : "▶"}
                        </span>
                        {t("version")} {version}
                      </summary>
                      <div className="p-3 bg-white">
                        {changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="py-1 text-sm text-gray-600 border-b border-gray-100 last:border-0"
                            dir={isHebrew ? "rtl" : "ltr"}
                          >
                            <span
                              className={`text-blue-600 font-bold ${isHebrew ? "ml-1" : "mr-1"}`}
                            >
                              •
                            </span>
                            {isHebrew ? change.he : change.en}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
              </div>
            </details>
          </section>
        </div>

        {/* Footer - Dedications (always in Hebrew as these are religious dedications) */}
        <div
          className="bg-amber-100 p-3 text-center text-sm text-amber-800 font-medium"
          dir="rtl"
        >
          <div>
            לעילוי נשמת <strong>ישראל שאול</strong> בן{" "}
            <strong>משה אהרון</strong> ו<strong>מלכה</strong> בת{" "}
            <strong>נתן</strong>
          </div>
          <div className="mt-1">
            רפואה שלימה ל<strong>מרדכי</strong> בן <strong>חנה</strong>
          </div>
        </div>

        <footer className="bg-gray-50 px-4 py-2 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white">
              <Image
                src="/claude.jpeg"
                alt="Claude"
                width={18}
                height={18}
                className="rounded-sm"
              />
              <span>Claude Code</span>
            </span>
            <span>{isHebrew ? "בנה," : "built,"}</span>
            <a
              href="https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-md bg-white hover:opacity-80"
            >
              <Image
                src="/rabbi.jpeg"
                alt={isHebrew ? "הרב שוקי" : "Rabbi Shuki"}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>{isHebrew ? "הרב שוקי" : "Rabbi Shuki"}</span>
            </a>
            <span>{isHebrew ? "הגה והכווין." : "conceived & directed."}</span>
          </div>
        </footer>

        <div className="bg-indigo-500 text-white p-2 text-center text-sm font-medium">
          יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד
        </div>
      </div>
    </>
  );
}
