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
import { PrefetchButton } from "./PrefetchButton";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bilingual changelog - Hebrew and English
const CHANGELOG: Record<string, { he: string; en: string }[]> = {
  "4": [
    {
      he: "ארכיטקטורת אופליין-פירסט - האפליקציה עובדת ללא אינטרנט",
      en: "Offline-first architecture - app works without internet",
    },
    {
      he: "אחסון ב-IndexedDB - ללא מגבלת נפח",
      en: "IndexedDB storage - unlimited capacity",
    },
    {
      he: "הורדת תוכן מראש - הורד שבוע קדימה לשימוש אופליין",
      en: "Content prefetch - download week ahead for offline use",
    },
    {
      he: "סנכרון אוטומטי ברקע - תוכן מתעדכן בשקט",
      en: "Automatic background sync - content updates silently",
    },
    {
      he: "חיווי מצב אופליין - באנר צהוב כשאין חיבור",
      en: "Offline status indicator - yellow banner when disconnected",
    },
    {
      he: "תרגום מלא לאנגלית ועברית",
      en: "Full Hebrew and English translations",
    },
    {
      he: "לוח שנה עם חיווי התקדמות - וי ירוק להושלם, אחוז לחלקי",
      en: "Calendar with progress indicators - checkmark for complete, percentage for partial",
    },
    {
      he: "סינון לפי תאריך - לחיצה על תאריך בלוח מציגה רק אותו",
      en: "Date filtering - clicking a calendar date shows only that day",
    },
    {
      he: "חיווי ויזואלי בהחלקה - משוב מיידי לפעולות סימון",
      en: "Swipe visual feedback - immediate response to marking actions",
    },
    {
      he: "שאלת סימון אוטומטי - האם לסמן גם הלכות קודמות",
      en: "Auto-mark prompt - option to mark previous halakhot too",
    },
  ],
  "3": [
    {
      he: "מעבר ל-Next.js 16 ו-React 19",
      en: "Migrated to Next.js 16 and React 19",
    },
    {
      he: "תמיכה בספר המצוות - לימוד תרי״ג מצוות במחזור שנתי",
      en: "Sefer HaMitzvot support - 613 commandments yearly cycle",
    },
    {
      he: "שלושה מסלולי לימוד: 3 פרקים, פרק אחד, או ספר המצוות",
      en: "Three study paths: 3 chapters, 1 chapter, or Sefer HaMitzvot",
    },
    {
      he: "תצוגה דו-לשונית: עברית, אנגלית, או שניהם",
      en: "Bilingual display: Hebrew, English, or both",
    },
    {
      he: "אשף הגדרה ראשונית: שפה, מסלול, שפת טקסט, והעדפות",
      en: "Setup wizard: language, path, text language, and preferences",
    },
    {
      he: "פריסה אוטומטית ל-Cloudflare Workers",
      en: "Automated deployment to Cloudflare Workers",
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

// Contributors for each version
const CONTRIBUTORS: Record<
  string,
  { name: { he: string; en: string }; avatar: string; link?: string }
> = {
  "0": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
  },
  "1": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
  },
  "2": {
    name: { he: "הרב שוקי", en: "Rabbi Shuki" },
    avatar: "/rabbi.jpeg",
    link: "https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם",
  },
  "3": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "https://github.com/meirpro.png",
  },
  "4": {
    name: { he: "מאיר", en: "Meir" },
    avatar: "https://github.com/meirpro.png",
  },
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

  const { confirm } = useConfirmDialog();

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

          {/* Offline Download */}
          <section className="p-4 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isHebrew ? "הורדה לשימוש אופליין" : "Download for Offline"}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              {isHebrew
                ? "הורד את התוכן של השבוע הקרוב לשימוש ללא אינטרנט"
                : "Download next week's content for offline use"}
            </p>
            <PrefetchButton />
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
                  .map(([version, changes]) => {
                    const contributor = CONTRIBUTORS[version];
                    return (
                      <details
                        key={version}
                        className="mb-2 border rounded-lg overflow-hidden"
                        open={version === "4"}
                      >
                        <summary className="px-3 py-2 bg-gray-50 font-semibold text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2">
                          <span className="inline-block transition-transform">
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
                    );
                  })}

                {/* Credits section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                    {isHebrew ? "קרדיטים" : "Credits"}
                  </h4>
                  <div className="flex flex-col gap-3">
                    {/* Rabbi Shuki - conceived and directed */}
                    <a
                      href="https://wa.me/972586030770?text=אהבתי%20את%20האפליקציה%20של%20הרמבם"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Image
                        src="/rabbi.jpeg"
                        alt="Rabbi Shuki"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                          {isHebrew ? "הרב שוקי" : "Rabbi Shuki"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isHebrew ? "הגה והכווין" : "Conceived & directed"}
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="#25D366"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </a>

                    {/* Claude Code - built */}
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                      <Image
                        src="/claude.jpeg"
                        alt="Claude Code"
                        width={40}
                        height={40}
                        className="rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                          Claude Code
                        </div>
                        <div className="text-xs text-gray-500">
                          {isHebrew ? "בנה" : "Built"}
                        </div>
                      </div>
                    </div>

                    {/* Meir - contributor */}
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                      <Image
                        src="https://github.com/meirpro.png"
                        alt="Meir"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                          {isHebrew ? "מאיר" : "Meir"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isHebrew ? "תרם" : "Contributor"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </section>
        </div>

        {/* Dedications (always in Hebrew as these are religious dedications) */}
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
            לרפואה שלימה ל<strong>מרדכי</strong> בן <strong>חנה</strong>
          </div>
        </div>

        <div className="bg-indigo-500 text-white p-2 text-center text-sm font-medium">
          יחי אדוננו מורנו ורבינו מלך המשיח לעולם ועד
        </div>
      </div>
    </>
  );
}
