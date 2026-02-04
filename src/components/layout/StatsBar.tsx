"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useStats } from "@/hooks/useStats";
import { useLocationStore } from "@/stores/locationStore";

export function StatsBar() {
  const t = useTranslations("stats");
  const { completedDays, totalDays, todayPercent, backlog } = useStats();
  const hasCompletedSetup = useLocationStore(
    (state) => state.hasCompletedSetup,
  );

  // Scroll direction detection for hide/show behavior
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

      // Only trigger if scroll delta is significant (> 10px)
      if (scrollDelta > 10) {
        if (scrollingDown && currentScrollY > 100) {
          setIsVisible(false);
        } else if (!scrollingDown) {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const baseClasses = `
    bg-gray-50 px-4 py-3 flex justify-around border-b-2 border-gray-200 gap-2
    sticky top-[60px] z-[100] transition-transform duration-300
    ${isVisible ? "translate-y-0" : "-translate-y-full"}
  `;

  // Don't show stats until location is set up and we have data
  if (!hasCompletedSetup || totalDays === 0) {
    return (
      <div className={baseClasses}>
        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-gray-300">—</span>
          <span className="text-sm text-gray-500 mt-0.5">
            {t("completedDays")}
          </span>
        </div>

        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-gray-300">—</span>
          <span className="text-sm text-gray-500 mt-0.5">{t("today")}</span>
        </div>

        <div className="text-center flex-1">
          <span className="block text-2xl font-bold text-gray-300">—</span>
          <span className="text-sm text-gray-500 mt-0.5">{t("backlog")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="text-center flex-1">
        <span className="block text-2xl font-bold text-blue-600">
          {completedDays}/{totalDays}
        </span>
        <span className="text-sm text-gray-500 mt-0.5">
          {t("completedDays")}
        </span>
      </div>

      <div className="text-center flex-1">
        <span className="block text-2xl font-bold text-blue-600">
          {todayPercent}%
        </span>
        <span className="text-sm text-gray-500 mt-0.5">{t("today")}</span>
      </div>

      <div className="text-center flex-1">
        <span className="block text-2xl font-bold text-blue-600">
          {backlog}
        </span>
        <span className="text-sm text-gray-500 mt-0.5">{t("backlog")}</span>
      </div>
    </div>
  );
}
