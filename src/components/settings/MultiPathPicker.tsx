"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/stores/appStore";
import type { StudyPath } from "@/types";

const PATHS: StudyPath[] = ["rambam3", "rambam1", "mitzvot"];

export function MultiPathPicker() {
  const t = useTranslations();
  const activePaths = useAppStore((state) => state.activePaths) ?? ["rambam3"];
  const togglePath = useAppStore((state) => state.togglePath);

  const pathLabels: Record<StudyPath, string> = {
    rambam3: t("paths.rambam3.label"),
    rambam1: t("paths.rambam1.label"),
    mitzvot: t("paths.mitzvot.label"),
  };

  const pathDescriptions: Record<StudyPath, string> = {
    rambam3: t("paths.rambam3.description"),
    rambam1: t("paths.rambam1.description"),
    mitzvot: t("paths.mitzvot.description"),
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-500 mb-2">
        {t("paths.selectMultiple")}
      </div>
      {PATHS.map((path) => {
        const isActive = activePaths.includes(path);
        const isLastActive = isActive && activePaths.length === 1;

        return (
          <button
            key={path}
            onClick={() => togglePath(path)}
            disabled={isLastActive}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all
              ${
                isActive
                  ? "bg-blue-50 border-blue-500 text-blue-900"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }
              ${isLastActive ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {/* Checkbox indicator */}
            <div
              className={`
                w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                ${isActive ? "bg-blue-500 text-white" : "border-2 border-gray-300"}
              `}
            >
              {isActive && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Path info */}
            <div className="flex-1 text-start">
              <div className="font-medium">{pathLabels[path]}</div>
              <div className="text-sm text-gray-500">
                {pathDescriptions[path]}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
