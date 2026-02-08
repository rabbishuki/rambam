/**
 * Tutorial Stages Configuration
 *
 * Defines the progressive tutorial stages for the Daily Rambam app.
 * Each stage teaches a key interaction or feature with demo data.
 */

export interface TutorialStage {
  id: string;
  titleKey: string; // i18n key for title
  instructionKey: string; // i18n key for instruction
  hintKey?: string; // i18n key for hint
  advanceOn: TutorialAdvanceCondition;
  /** Which UI element to highlight (draws attention via pulse/spotlight) */
  highlightElement?: HighlightTarget;
  /** Minimum actions required before manual advancement */
  minActionsRequired?: number;
}

export type TutorialAdvanceCondition =
  | { type: "manual" } // User clicks "Next"
  | { type: "swipe-right" } // User swipes right on demo card
  | { type: "swipe-left" } // User swipes left on demo card
  | { type: "double-tap" } // User double-taps demo card
  | { type: "calendar-open" } // User opens calendar
  | { type: "settings-open" }; // User opens settings

export type HighlightTarget =
  | "demo-card"
  | "calendar-button"
  | "settings-button"
  | "stats-bar"
  | "fab-button"
  | "day-checkmark"
  | "info-icon"
  | "bookmarks-button"
  | "summary-editor"
  | "share-button";

/**
 * Tutorial stages in order
 *
 * Stage flow with persistent card state:
 * 1. welcome - Click Next
 * 2. swipe-right - 3 cards (incomplete), swipe RIGHT on each (3× total), left disabled
 * 3. swipe-left - 3 cards (completed from stage 2), swipe LEFT on one to uncomplete
 * 4. mark-all - 3 cards (1 incomplete from stage 3), swipe LEFT to mark all previous
 * 5. double-tap - 1 card, double-tap to expand, then Continue
 * 6. info-icon - Learn about the info button and long-press to see links
 * 7. bookmarks - Bookmarks (shares info-icon demo layer)
 * 8. day-checkmark - Learn about the checkmark to mark entire day complete
 * 9-11. Info stages about FAB, calendar, settings
 * 12. complete - Start learning
 */
export const TUTORIAL_STAGES: TutorialStage[] = [
  {
    id: "welcome",
    titleKey: "tutorial.welcome.title",
    instructionKey: "tutorial.welcome.instruction",
    advanceOn: { type: "manual" },
  },
  {
    id: "swipe-right",
    titleKey: "tutorial.swipeRight.title",
    instructionKey: "tutorial.swipeRight.instruction",
    hintKey: "tutorial.swipeRight.hint",
    advanceOn: { type: "swipe-right" },
    highlightElement: "demo-card",
    /** Must complete all 3 cards */
    minActionsRequired: 3,
  },
  {
    id: "swipe-left",
    titleKey: "tutorial.swipeLeft.title",
    instructionKey: "tutorial.swipeLeft.instruction",
    hintKey: "tutorial.swipeLeft.hint",
    advanceOn: { type: "manual" }, // Manual or auto-advance when all 3 undone
    highlightElement: "demo-card",
    /** Can undo up to 3 cards, or skip with Next */
    minActionsRequired: 0,
  },
  {
    id: "mark-all",
    titleKey: "tutorial.markAll.title",
    instructionKey: "tutorial.markAll.instruction",
    advanceOn: { type: "manual" }, // Manual or continue practicing
    highlightElement: "demo-card",
    /** Perform mark-all gesture once */
    minActionsRequired: 1,
  },
  {
    id: "double-tap",
    titleKey: "tutorial.doubleTap.title",
    instructionKey: "tutorial.doubleTap.instruction",
    hintKey: "tutorial.doubleTap.hint",
    advanceOn: { type: "manual" },
    highlightElement: "demo-card",
    /** User must perform action before Continue is shown */
    minActionsRequired: 1,
  },
  {
    id: "info-icon",
    titleKey: "tutorial.infoIcon.title",
    instructionKey: "tutorial.infoIcon.instruction",
    hintKey: "tutorial.infoIcon.hint",
    advanceOn: { type: "manual" },
    highlightElement: "info-icon",
  },
  {
    id: "bookmarks",
    titleKey: "tutorial.bookmarks.title",
    instructionKey: "tutorial.bookmarks.instruction",
    hintKey: "tutorial.bookmarks.hint",
    advanceOn: { type: "manual" },
    highlightElement: "info-icon",
  },
  {
    id: "day-checkmark",
    titleKey: "tutorial.dayCheckmark.title",
    instructionKey: "tutorial.dayCheckmark.instruction",
    advanceOn: { type: "manual" },
    highlightElement: "day-checkmark",
  },
  {
    id: "jump-button",
    titleKey: "tutorial.jumpButton.title",
    instructionKey: "tutorial.jumpButton.instruction",
    advanceOn: { type: "manual" },
    highlightElement: "fab-button",
  },
  {
    id: "calendar",
    titleKey: "tutorial.calendar.title",
    instructionKey: "tutorial.calendar.instruction",
    advanceOn: { type: "manual" },
    highlightElement: "calendar-button",
  },
  {
    id: "settings",
    titleKey: "tutorial.settings.title",
    instructionKey: "tutorial.settings.instruction",
    advanceOn: { type: "manual" },
    highlightElement: "settings-button",
  },
  {
    id: "header-colors",
    titleKey: "tutorial.headerColors.title",
    instructionKey: "tutorial.headerColors.instruction",
    hintKey: "tutorial.headerColors.hint",
    advanceOn: { type: "manual" },
  },
  {
    id: "summaries",
    titleKey: "tutorial.summaries.title",
    instructionKey: "tutorial.summaries.instruction",
    hintKey: "tutorial.summaries.hint",
    advanceOn: { type: "manual" },
    highlightElement: "summary-editor",
  },
  {
    id: "sharing",
    titleKey: "tutorial.sharing.title",
    instructionKey: "tutorial.sharing.instruction",
    advanceOn: { type: "manual" },
    highlightElement: "share-button",
  },
  {
    id: "complete",
    titleKey: "tutorial.complete.title",
    instructionKey: "tutorial.complete.instruction",
    advanceOn: { type: "manual" },
  },
];

/**
 * Check if a stage is the final stage
 */
export function isFinalStage(stageId: string): boolean {
  return stageId === "complete";
}

/**
 * Get stage by ID
 */
export function getStageById(stageId: string): TutorialStage | undefined {
  return TUTORIAL_STAGES.find((stage) => stage.id === stageId);
}
