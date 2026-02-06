"use client";

import { useTranslations } from "next-intl";
import type { StudyPath } from "@/types";

interface PathBadgeProps {
  path: StudyPath;
  size?: "sm" | "md";
}

const PATH_COLORS: Record<StudyPath, string> = {
  rambam3:
    "bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] border-[var(--color-primary)]/30",
  rambam1: "bg-purple-100 text-purple-800 border-purple-200",
  mitzvot: "bg-amber-100 text-amber-800 border-amber-200",
};

export function PathBadge({ path, size = "sm" }: PathBadgeProps) {
  const t = useTranslations();

  const labels: Record<StudyPath, string> = {
    rambam3: t("paths.badge.rambam3"),
    rambam1: t("paths.badge.rambam1"),
    mitzvot: t("paths.badge.mitzvot"),
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${PATH_COLORS[path]}
        ${sizeClasses[size]}
      `}
    >
      {labels[path]}
    </span>
  );
}
