"use client";

import { useLocale, useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExternalLinks } from "./ExternalLinks";
import {
  sefariaUrl,
  chabadRambamUrl,
  chabadMitzvotUrl,
} from "@/lib/externalLinks";
import type { DayData, StudyPath } from "@/types";

interface HalakhaInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: DayData;
  halakhaIndex: number;
  date: string;
  studyPath: StudyPath;
}

export function HalakhaInfoSheet({
  isOpen,
  onClose,
  dayData,
  halakhaIndex,
  date,
  studyPath,
}: HalakhaInfoSheetProps) {
  const locale = useLocale();
  const t = useTranslations("info");
  const isHebrew = locale === "he";

  // Get the display title
  const displayTitle = isHebrew ? dayData.he : dayData.en || dayData.he;

  // Get the reference for external links
  const ref = dayData.ref;

  // Sefaria and Chabad links based on study path
  const sefariaLink = sefariaUrl(ref);
  const chabadLink =
    studyPath === "mitzvot"
      ? chabadMitzvotUrl(date)
      : chabadRambamUrl(date, studyPath === "rambam1" ? 1 : 3);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t("moreInfo")}>
      <div className="space-y-4" dir={isHebrew ? "rtl" : "ltr"}>
        {/* Chapter/Section title */}
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {displayTitle}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isHebrew ? "הלכה" : "Halakha"} {halakhaIndex + 1}
          </p>
        </div>

        {/* External links */}
        <ExternalLinks sefariaLink={sefariaLink} chabadLink={chabadLink} />

        {/* Reference */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">{ref}</p>
        </div>
      </div>
    </BottomSheet>
  );
}
