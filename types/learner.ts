/**
 * Learner-related types shared across client and server.
 *
 * We re-export the Prisma-generated enums so the UI and agent code reference a
 * single source of truth. String-literal mirrors are provided for places that
 * can't import the Prisma client (e.g. pure client components in some bundler
 * setups) — keep them in sync with schema.prisma.
 */

export type LearningStyle =
  | "VISUAL"
  | "AUDITORY"
  | "READING"
  | "KINESTHETIC"
  | "MIXED";

export type Pace = "SLOW" | "MODERATE" | "FAST";

export type ExplanationLength = "BRIEF" | "MODERATE" | "DETAILED";

/** Known disability tags. Stored lowercased in LearnerProfile.disabilities. */
export type DisabilityTag = "dyslexia" | "adhd" | "esl" | "dyscalculia" | "dysgraphia";

/**
 * Plain shape of a learner profile used by the agent + UI. Mirrors
 * LearnerProfile in the Prisma schema but with primitive types only, so it can
 * be passed through the network boundary and serialized safely.
 */
export interface LearnerProfileData {
  id: string;
  userId: string;
  onboardingComplete: boolean;
  learningStyle: LearningStyle;
  pace: Pace;
  disabilities: string[];
  subjects: string[];
  gradeLevel: string | null;
  nativeLanguage: string;
  preferredExplanationLength: ExplanationLength;
  confusionKeywords: string[];
  successPatterns: string[];
  totalSessions: number;
}

/** Fields the onboarding agent extracts and writes back to the profile. */
export interface OnboardingExtraction {
  subjects?: string[];
  learningStyle?: LearningStyle;
  disabilities?: string[];
  gradeLevel?: string;
  nativeLanguage?: string;
  pace?: Pace;
  preferredExplanationLength?: ExplanationLength;
  successPatterns?: string[];
}

/** User-controllable accessibility preferences (persisted client-side). */
export interface AccessibilityPrefs {
  dyslexicFont: boolean;
  highContrast: boolean;
  /** Base font size in px, clamped 14..22 per WCAG requirement in spec. */
  fontSize: number;
  reduceMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  dyslexicFont: false,
  highContrast: false,
  fontSize: 16,
  reduceMotion: false,
};
