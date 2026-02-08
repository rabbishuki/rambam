"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { getTheme } from "@/config/themes";
import type { ThemeId, CardStyle } from "@/types";

/**
 * Hook that applies the current theme's CSS variables to the document root.
 * Call this once at the top-level page component.
 */
export function useTheme(): {
  theme: ThemeId;
  cardStyle: CardStyle;
  isDark: boolean;
} {
  const theme = useAppStore((s) => s.theme);
  const cardStyle = useAppStore((s) => s.cardStyle);

  const themeDef = getTheme(theme);

  useEffect(() => {
    const root = document.documentElement;

    // Apply all CSS variables from the theme definition
    for (const [key, value] of Object.entries(themeDef.colors)) {
      root.style.setProperty(key, value);
    }

    // Set app-bg to match the theme bg
    root.style.setProperty("--app-bg", themeDef.colors["--color-bg"]);

    // Set data-theme for CSS-level selectors (e.g. dark mode overrides)
    root.setAttribute("data-theme", themeDef.isDark ? "dark" : "light");

    // Update the meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        themeDef.colors["--color-primary"],
      );
    }
  }, [themeDef]);

  return {
    theme,
    cardStyle,
    isDark: themeDef.isDark,
  };
}
