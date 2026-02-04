"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import { Toggle } from "@/components/ui/Toggle";
import type { StudyPath } from "@/types";

export function StudyPathPicker() {
  const t = useTranslations("paths");
  const studyPath = useAppStore((state) => state.studyPath);
  const setStudyPath = useAppStore((state) => state.setStudyPath);

  const handlePathChange = (value: StudyPath) => {
    setStudyPath(value);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Compact toggle for Rambam chapter options */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          {t("chaptersPerDay")}
        </label>
        <Toggle
          options={[
            { value: "rambam1" as const, label: t("rambam1.short") },
            { value: "rambam3" as const, label: t("rambam3.short") },
          ]}
          value={studyPath === "mitzvot" ? "rambam3" : studyPath}
          onChange={handlePathChange}
          className={studyPath === "mitzvot" ? "opacity-50" : ""}
        />
      </div>

      {/* Sefer HaMitzvot option */}
      <button
        type="button"
        onClick={() => handlePathChange("mitzvot")}
        className={`
          flex items-center justify-between p-3 rounded-lg border-2 transition-all text-sm
          ${
            studyPath === "mitzvot"
              ? "border-blue-600 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              studyPath === "mitzvot" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {studyPath === "mitzvot" && (
              <div className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
          <span
            className={
              studyPath === "mitzvot" ? "text-blue-600 font-medium" : ""
            }
          >
            {t("mitzvot.label")}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {t("mitzvot.description")}
        </span>
      </button>
    </div>
  );
}
