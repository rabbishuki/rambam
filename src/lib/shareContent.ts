/**
 * Share content generation utility
 * Creates formatted text for sharing study progress
 */

import type { StudyPath } from "@/types";

interface ShareContentOptions {
  path: StudyPath;
  date: string;
  summaryText?: string;
  dayTitle?: string;
  completedDays?: number;
  totalDays?: number;
  locale?: string;
}

interface ShareContent {
  text: string;
  url: string;
  hashtags: string[];
}

const APP_URL = "https://rambam.meir.pro";

// Hashtags for sharing
const HASHTAGS = ["RambamYomi", "DailyRambam", "Cycle46", "Torah"];

/**
 * Generate share text content
 */
export function generateShareContent(
  options: ShareContentOptions,
): ShareContent {
  const {
    summaryText,
    dayTitle,
    completedDays,
    totalDays,
    locale = "en",
  } = options;

  const isHebrew = locale === "he";
  const hashtags = HASHTAGS;
  const hashtagsText = hashtags.map((h) => `#${h}`).join(" ");

  // Build the share text
  const lines: string[] = [];

  // Header
  lines.push(
    isHebrew ? '📚 ההתקדמות שלי ברמב"ם' : "📚 My Rambam Study Progress",
  );
  lines.push("");

  // Progress stats (if available)
  if (completedDays !== undefined && totalDays !== undefined) {
    lines.push(
      isHebrew
        ? `✅ הושלמו: ${completedDays}/${totalDays} ימים`
        : `✅ Completed: ${completedDays}/${totalDays} days`,
    );
  }

  // Current day title (if available)
  if (dayTitle) {
    lines.push(isHebrew ? `📖 כרגע: ${dayTitle}` : `📖 Current: ${dayTitle}`);
  }

  lines.push("");

  // Summary text (if available)
  if (summaryText) {
    lines.push(isHebrew ? "💭 מה למדתי היום:" : "💭 What I learned today:");
    lines.push(summaryText);
    lines.push("");
  }

  // Hashtags and link
  lines.push(hashtagsText);
  lines.push(`🔗 ${APP_URL}`);

  return {
    text: lines.join("\n"),
    url: APP_URL,
    hashtags,
  };
}

/**
 * Share content using Web Share API or clipboard fallback
 */
export async function shareContent(content: ShareContent): Promise<boolean> {
  const { text } = content;

  // Try Web Share API first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Daily Rambam",
        text,
      });
      return true;
    } catch (err) {
      // User cancelled or error - fall through to clipboard
      if ((err as Error).name === "AbortError") {
        return false; // User cancelled
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Web Share API is available
 */
export function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}
