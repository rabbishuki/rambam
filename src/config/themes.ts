/**
 * Theme definitions for the Daily Rambam app.
 * Each theme maps CSS variable names to color values.
 *
 * Colors are chosen to be soft/pastel-leaning while maintaining
 * sufficient contrast for accessibility (white text on primary buttons).
 */

import type { ThemeId } from "@/types";

export interface ThemeDefinition {
  id: ThemeId;
  isDark: boolean;
  colors: Record<string, string>;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  teal: {
    id: "teal",
    isDark: false,
    colors: {
      "--color-primary": "#0d9488",
      "--color-primary-dark": "#0f766e",
      "--color-accent": "#f59e0b",
      "--color-alt-date": "#9333ea",
      "--color-bg": "#0d9488",
      "--color-surface": "#ffffff",
      "--color-surface-glass": "rgba(255,255,255,0.75)",
      "--color-surface-hover": "#f0fdfa",
      "--color-surface-border": "#e5e7eb",
      "--color-text-primary": "#1f2937",
      "--color-text-secondary": "#4b5563",
      "--color-text-muted": "#9ca3af",
      "--color-completion-bg": "#f0fdf4",
      "--color-completion-border": "#bbf7d0",
      "--color-completion-accent": "#22c55e",
      "--color-status-normal": "#0d9488",
      "--color-status-other-date": "#dc2626",
      "--color-status-offline": "#f59e0b",
    },
  },
  sky: {
    id: "sky",
    isDark: false,
    colors: {
      "--color-primary": "#0284c7",
      "--color-primary-dark": "#0369a1",
      "--color-accent": "#f59e0b",
      "--color-alt-date": "#e11d48",
      "--color-bg": "#0284c7",
      "--color-surface": "#ffffff",
      "--color-surface-glass": "rgba(255,255,255,0.75)",
      "--color-surface-hover": "#f0f9ff",
      "--color-surface-border": "#e0e7ef",
      "--color-text-primary": "#1e293b",
      "--color-text-secondary": "#475569",
      "--color-text-muted": "#94a3b8",
      "--color-completion-bg": "#f0fdf4",
      "--color-completion-border": "#bbf7d0",
      "--color-completion-accent": "#22c55e",
      "--color-status-normal": "#0284c7",
      "--color-status-other-date": "#e11d48",
      "--color-status-offline": "#f59e0b",
    },
  },
  lavender: {
    id: "lavender",
    isDark: false,
    colors: {
      "--color-primary": "#7c3aed",
      "--color-primary-dark": "#6d28d9",
      "--color-accent": "#06b6d4",
      "--color-alt-date": "#e11d48",
      "--color-bg": "#7c3aed",
      "--color-surface": "#ffffff",
      "--color-surface-glass": "rgba(255,255,255,0.75)",
      "--color-surface-hover": "#f5f3ff",
      "--color-surface-border": "#e5e1f0",
      "--color-text-primary": "#1f2937",
      "--color-text-secondary": "#4b5563",
      "--color-text-muted": "#9ca3af",
      "--color-completion-bg": "#f0fdf4",
      "--color-completion-border": "#bbf7d0",
      "--color-completion-accent": "#22c55e",
      "--color-status-normal": "#7c3aed",
      "--color-status-other-date": "#e11d48",
      "--color-status-offline": "#f59e0b",
    },
  },
  rose: {
    id: "rose",
    isDark: false,
    colors: {
      "--color-primary": "#e11d48",
      "--color-primary-dark": "#be123c",
      "--color-accent": "#0d9488",
      "--color-alt-date": "#7c3aed",
      "--color-bg": "#e11d48",
      "--color-surface": "#ffffff",
      "--color-surface-glass": "rgba(255,255,255,0.75)",
      "--color-surface-hover": "#fff1f2",
      "--color-surface-border": "#f0e0e3",
      "--color-text-primary": "#1f2937",
      "--color-text-secondary": "#4b5563",
      "--color-text-muted": "#9ca3af",
      "--color-completion-bg": "#f0fdf4",
      "--color-completion-border": "#bbf7d0",
      "--color-completion-accent": "#22c55e",
      "--color-status-normal": "#e11d48",
      "--color-status-other-date": "#0284c7",
      "--color-status-offline": "#f59e0b",
    },
  },
  sage: {
    id: "sage",
    isDark: false,
    colors: {
      "--color-primary": "#059669",
      "--color-primary-dark": "#047857",
      "--color-accent": "#eab308",
      "--color-alt-date": "#dc2626",
      "--color-bg": "#059669",
      "--color-surface": "#ffffff",
      "--color-surface-glass": "rgba(255,255,255,0.75)",
      "--color-surface-hover": "#ecfdf5",
      "--color-surface-border": "#e0ebe5",
      "--color-text-primary": "#1f2937",
      "--color-text-secondary": "#4b5563",
      "--color-text-muted": "#9ca3af",
      "--color-completion-bg": "#eff6ff",
      "--color-completion-border": "#bfdbfe",
      "--color-completion-accent": "#2563eb",
      "--color-status-normal": "#059669",
      "--color-status-other-date": "#dc2626",
      "--color-status-offline": "#f59e0b",
    },
  },
  dark: {
    id: "dark",
    isDark: true,
    colors: {
      "--color-primary": "#38bdf8",
      "--color-primary-dark": "#0284c7",
      "--color-accent": "#a78bfa",
      "--color-alt-date": "#f472b6",
      "--color-bg": "#0f172a",
      "--color-surface": "#1e293b",
      "--color-surface-glass": "rgba(30,41,59,0.75)",
      "--color-surface-hover": "#334155",
      "--color-surface-border": "#334155",
      "--color-text-primary": "#f1f5f9",
      "--color-text-secondary": "#94a3b8",
      "--color-text-muted": "#64748b",
      "--color-completion-bg": "#052e16",
      "--color-completion-border": "#166534",
      "--color-completion-accent": "#22c55e",
      "--color-status-normal": "#38bdf8",
      "--color-status-other-date": "#f472b6",
      "--color-status-offline": "#fbbf24",
    },
  },
};

/** Get a theme by ID, falling back to teal */
export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES[id] ?? THEMES.teal;
}
