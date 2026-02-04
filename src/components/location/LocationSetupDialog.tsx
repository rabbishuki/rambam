"use client";

import { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useLocationStore } from "@/stores/locationStore";
import { useAppStore } from "@/stores/appStore";
import { getUserLocation, reverseGeocode } from "@/services/geocoding";
import { fetchSunset } from "@/services/hebcal";
import { getTodayInIsrael } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { StudyPath, TextLanguage } from "@/types";

interface LocationSetupDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Step = "language" | "path" | "textLang" | "choice" | "manual" | "loading";

/**
 * Dialog for initial app setup:
 * 1. Language selection
 * 2. Location method choice
 * 3. Manual city input (optional)
 */
export function LocationSetupDialog({
  isOpen,
  onComplete,
}: LocationSetupDialogProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locationDialog");
  const tPaths = useTranslations("paths");
  const tLang = useTranslations("language");

  // Start with language step if not yet selected, otherwise location choice
  const [step, setStep] = useState<Step>("language");
  const [manualCity, setManualCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<StudyPath>("rambam3");
  const [selectedTextLang, setSelectedTextLang] =
    useState<TextLanguage>("hebrew");

  const setLocation = useLocationStore((state) => state.setLocation);
  const setSunset = useLocationStore((state) => state.setSunset);
  const markLocationSetup = useLocationStore(
    (state) => state.markLocationSetup,
  );
  const setStudyPath = useAppStore((state) => state.setStudyPath);
  const setTextLanguage = useAppStore((state) => state.setTextLanguage);

  // Handle language selection
  const handleSelectLanguage = useCallback(
    (newLocale: "he" | "en") => {
      if (newLocale !== locale) {
        // Navigate to the new locale
        const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
        router.push(newPath);
      }
      // Move to path selection step
      setStep("path");
    },
    [locale, pathname, router],
  );

  // Handle path selection and continue to text language
  const handlePathContinue = useCallback(() => {
    setStudyPath(selectedPath);
    setStep("textLang");
  }, [selectedPath, setStudyPath]);

  // Handle text language selection and continue to location
  const handleTextLangContinue = useCallback(() => {
    setTextLanguage(selectedTextLang);
    setStep("choice");
  }, [selectedTextLang, setTextLanguage]);

  // Handle "Use My Location" - will trigger browser permission
  const handleUseMyLocation = useCallback(async () => {
    setStep("loading");
    setError(null);

    try {
      const { coords, isDefault } = await getUserLocation();

      if (isDefault) {
        // User denied permission or geolocation failed
        setError(t("errorDetecting"));
        setStep("manual");
        return;
      }

      // Got real location - reverse geocode it (bilingual)
      const cityNames = await reverseGeocode(coords);
      console.log("[Location] Browser geolocation recognized:", {
        coords,
        cityNames,
      });
      setLocation(coords, cityNames, false, false);

      // Fetch sunset for this location
      const today = getTodayInIsrael();
      const sunsetData = await fetchSunset(today, coords);
      console.log("[Location] Sunset fetched:", sunsetData);
      setSunset(sunsetData);

      markLocationSetup();
      onComplete();
    } catch (err) {
      console.error("Location error:", err);
      setError(t("errorGeneral"));
      setStep("manual");
    }
  }, [setLocation, setSunset, markLocationSetup, onComplete, t]);

  // Handle manual city entry
  const handleManualSubmit = useCallback(async () => {
    if (!manualCity.trim()) {
      setError(t("errorEmptyCity"));
      return;
    }

    setStep("loading");
    setError(null);

    try {
      // Use Nominatim (OpenStreetMap) for forward geocoding - fetch both Hebrew and English
      const [heResponse, enResponse] = await Promise.all([
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualCity)}&format=json&limit=1&accept-language=he`,
          { headers: { "User-Agent": "RambamDailyTracker/1.0" } },
        ),
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualCity)}&format=json&limit=1&accept-language=en`,
          { headers: { "User-Agent": "RambamDailyTracker/1.0" } },
        ),
      ]);

      if (!heResponse.ok || !enResponse.ok) {
        throw new Error("Geocoding failed");
      }

      const [heData, enData] = await Promise.all([
        heResponse.json(),
        enResponse.json(),
      ]);

      if (!heData || heData.length === 0) {
        throw new Error("City not found");
      }

      const heResult = heData[0];
      const enResult = enData[0] || heResult;

      const coords = {
        latitude: parseFloat(heResult.lat),
        longitude: parseFloat(heResult.lon),
      };

      // Extract just the city part from display names
      const cityNames = {
        he: heResult.display_name.split(",")[0] || manualCity,
        en: enResult.display_name.split(",")[0] || manualCity,
      };

      console.log("[Location] Manual city recognized:", {
        input: manualCity,
        result: {
          cityNames,
          coords,
        },
      });
      setLocation(coords, cityNames, true, false);

      // Fetch sunset for this location
      const today = getTodayInIsrael();
      const sunsetData = await fetchSunset(today, coords);
      console.log("[Location] Sunset fetched:", sunsetData);
      setSunset(sunsetData);

      markLocationSetup();
      onComplete();
    } catch (err) {
      console.error("Manual location error:", err);
      setError(t("errorCityNotFound"));
      setStep("manual");
    }
  }, [manualCity, setLocation, setSunset, markLocationSetup, onComplete, t]);

  // Handle "Enter Manually" choice
  const handleChooseManual = useCallback(() => {
    setStep("manual");
    setError(null);
  }, []);

  // Handle back navigation
  const handleBackToLanguage = useCallback(() => {
    setStep("language");
    setError(null);
  }, []);

  const handleBackToChoice = useCallback(() => {
    setStep("choice");
    setError(null);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      title={
        step === "language"
          ? t("languageTitle")
          : step === "path"
            ? t("pathTitle")
            : step === "textLang"
              ? t("textLangTitle")
              : t("title")
      }
      onClose={() => {}}
    >
      <div className="text-center">
        {/* Step 1: Language Selection */}
        {step === "language" && (
          <>
            <div className="text-5xl mb-4">🌐</div>
            <p className="text-gray-600 mb-6">{t("languageDescription")}</p>

            <div className="space-y-3">
              {/* Primary: Continue with auto-detected language */}
              <Button
                variant="primary"
                fullWidth
                onClick={() => setStep("path")}
              >
                {t("continueWithLanguage")}
              </Button>

              {/* Secondary: Switch to the other language */}
              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  handleSelectLanguage(locale === "he" ? "en" : "he")
                }
              >
                {locale === "he" ? "🇺🇸 Switch to English" : "🇮🇱 עבור לעברית"}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Study Path Selection */}
        {step === "path" && (
          <>
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-600 mb-6">{t("pathDescription")}</p>

            <div className="space-y-3 mb-6">
              {/* 3 Chapters option */}
              <button
                type="button"
                onClick={() => setSelectedPath("rambam3")}
                className={`
                  w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedPath === "rambam3"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPath === "rambam3"
                        ? "border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedPath === "rambam3" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`font-medium ${selectedPath === "rambam3" ? "text-blue-600" : ""}`}
                    >
                      {tPaths("rambam3.label")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tPaths("rambam3.description")}
                    </div>
                  </div>
                </div>
              </button>

              {/* 1 Chapter option */}
              <button
                type="button"
                onClick={() => setSelectedPath("rambam1")}
                className={`
                  w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedPath === "rambam1"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPath === "rambam1"
                        ? "border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedPath === "rambam1" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`font-medium ${selectedPath === "rambam1" ? "text-blue-600" : ""}`}
                    >
                      {tPaths("rambam1.label")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tPaths("rambam1.description")}
                    </div>
                  </div>
                </div>
              </button>

              {/* Sefer HaMitzvot option */}
              <button
                type="button"
                onClick={() => setSelectedPath("mitzvot")}
                className={`
                  w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedPath === "mitzvot"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPath === "mitzvot"
                        ? "border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedPath === "mitzvot" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`font-medium ${selectedPath === "mitzvot" ? "text-blue-600" : ""}`}
                    >
                      {tPaths("mitzvot.label")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tPaths("mitzvot.description")}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={handlePathContinue}>
                {t("continue")}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleBackToLanguage}
              >
                ← {t("changeLanguage")}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Text Display Language */}
        {step === "textLang" && (
          <>
            <div className="text-5xl mb-4">📖</div>
            <p className="text-gray-600 mb-6">{t("textLangDescription")}</p>

            <div className="space-y-3 mb-6">
              {/* Hebrew only */}
              <button
                type="button"
                onClick={() => setSelectedTextLang("hebrew")}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedTextLang === "hebrew"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTextLang === "hebrew"
                      ? "border-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedTextLang === "hebrew" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span
                  className={`font-medium ${selectedTextLang === "hebrew" ? "text-blue-600" : ""}`}
                >
                  {tLang("hebrew")}
                </span>
              </button>

              {/* English only */}
              <button
                type="button"
                onClick={() => setSelectedTextLang("english")}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedTextLang === "english"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTextLang === "english"
                      ? "border-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedTextLang === "english" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span
                  className={`font-medium ${selectedTextLang === "english" ? "text-blue-600" : ""}`}
                >
                  {tLang("english")}
                </span>
              </button>

              {/* Both */}
              <button
                type="button"
                onClick={() => setSelectedTextLang("both")}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-start
                  ${
                    selectedTextLang === "both"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTextLang === "both"
                      ? "border-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {selectedTextLang === "both" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span
                  className={`font-medium ${selectedTextLang === "both" ? "text-blue-600" : ""}`}
                >
                  {tLang("both")}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleTextLangContinue}
              >
                {t("continue")}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setStep("path")}
              >
                ← {t("back")}
              </Button>
            </div>
          </>
        )}

        {/* Loading state */}
        {step === "loading" && (
          <div className="py-8">
            <div className="text-5xl mb-4 animate-pulse text-blue-500">📍</div>
            <div className="text-gray-600">{t("detecting")}</div>
          </div>
        )}

        {/* Step 2: Location Choice */}
        {step === "choice" && (
          <>
            <svg
              className="w-16 h-16 mx-auto mb-4 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 0 0 20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
            </svg>
            <p className="text-gray-600 mb-6">{t("description")}</p>

            <div className="space-y-3">
              <Button variant="primary" fullWidth onClick={handleUseMyLocation}>
                📍 {t("useMyLocation")}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleChooseManual}
              >
                ✏️ {t("enterManually")}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setStep("textLang")}
              >
                ← {t("back")}
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-4">{t("privacyNote")}</p>
          </>
        )}

        {/* Step 6: Manual City Entry */}
        {step === "manual" && (
          <>
            <svg
              className="w-16 h-16 mx-auto mb-4 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" />
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <p className="text-gray-600 mb-4">{t("enterCity")}</p>

            {error && (
              <div className="bg-red-50 text-red-600 p-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder={t("cityPlaceholder")}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg text-center focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleManualSubmit();
                }
              }}
            />

            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handleManualSubmit}
                disabled={!manualCity.trim()}
              >
                {t("confirm")}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleBackToChoice}
              >
                {t("back")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
