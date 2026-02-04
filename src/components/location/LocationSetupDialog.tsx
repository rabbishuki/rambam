"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocationStore } from "@/stores/locationStore";
import { getUserLocation, reverseGeocode } from "@/services/geocoding";
import { fetchSunset } from "@/services/hebcal";
import { getTodayInIsrael } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface LocationSetupDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * Dialog that asks the user how they want to set their location
 * Must be shown BEFORE requesting browser geolocation permissions
 */
export function LocationSetupDialog({
  isOpen,
  onComplete,
}: LocationSetupDialogProps) {
  const t = useTranslations("locationDialog");
  const [step, setStep] = useState<"choice" | "manual" | "loading">("choice");
  const [manualCity, setManualCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setLocation = useLocationStore((state) => state.setLocation);
  const setSunset = useLocationStore((state) => state.setSunset);
  const markLocationSetup = useLocationStore(
    (state) => state.markLocationSetup,
  );

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

  // Handle back to choice
  const handleBack = useCallback(() => {
    setStep("choice");
    setError(null);
  }, []);

  return (
    <Modal isOpen={isOpen} title={t("title")} onClose={() => {}}>
      <div className="text-center">
        {step === "loading" && (
          <div className="py-8">
            <div className="text-5xl mb-4 animate-pulse text-blue-500">📍</div>
            <div className="text-gray-600">{t("detecting")}</div>
          </div>
        )}

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
            </div>

            <p className="text-xs text-gray-400 mt-4">{t("privacyNote")}</p>
          </>
        )}

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

              <Button variant="secondary" fullWidth onClick={handleBack}>
                {t("back")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
