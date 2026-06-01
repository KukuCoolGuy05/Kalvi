import type { LearnerProfileData } from "@/types/learner";

/**
 * confusionDetection.ts
 *
 * Cheap, deterministic, client-and-server-safe detection of confusion signals
 * in a user message. This runs BEFORE we call the model so that:
 *   1. The "I'm confused" UX can react instantly (highlight the reteach path).
 *   2. We can count consecutive confusion on the same concept and trip the
 *      update_learner_profile tool when it hits 3+.
 *
 * The model ALSO does its own, smarter confusion detection (it can catch a
 * confidently-wrong answer that no keyword would match). This module is the
 * fast first pass, not the only line of defense.
 */

// Baseline phrases from the spec. Compared case-insensitively against a
// normalized message. Kept as whole-ish phrases to avoid false positives like
// "what a great explanation".
const BASE_CONFUSION_PHRASES = [
  "i don't get it",
  "i dont get it",
  "i don't understand",
  "i dont understand",
  "i'm lost",
  "im lost",
  "i am lost",
  "can you explain again",
  "explain that again",
  "what do you mean",
  "huh",
  "what?",
  "i'm confused",
  "im confused",
  "this is confusing",
  "makes no sense",
  "no idea",
  "i don't know what",
  "still don't get",
  "lost me",
];

// Short interjections we only treat as confusion when they're the WHOLE
// message (so "what time is it" doesn't trip on "what").
const STANDALONE_TOKENS = new Set(["what", "huh", "wat", "eh", "?", "??", "???"]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface ConfusionResult {
  isConfused: boolean;
  /** Which phrase(s) matched — useful for logging + learning new keywords. */
  matched: string[];
  /** 0..1 rough confidence, for UI emphasis. */
  score: number;
}

/**
 * Detect confusion in a single user message.
 * @param message  Raw user message text.
 * @param profile  Optional profile so we also check learner-specific
 *                 confusionKeywords learned over time.
 */
export function detectConfusion(
  message: string,
  profile?: Pick<LearnerProfileData, "confusionKeywords">
): ConfusionResult {
  const norm = normalize(message);
  const matched: string[] = [];

  // Standalone short interjection (whole message is just "what?" / "huh").
  const stripped = norm.replace(/[.!]/g, "");
  if (STANDALONE_TOKENS.has(stripped)) {
    matched.push(stripped || "?");
  }

  // Phrase containment.
  const phrases = [
    ...BASE_CONFUSION_PHRASES,
    ...(profile?.confusionKeywords ?? []).map((k) => k.toLowerCase()),
  ];
  for (const phrase of phrases) {
    if (phrase && norm.includes(phrase)) matched.push(phrase);
  }

  const unique = Array.from(new Set(matched));
  // Confidence grows with number of independent matches, capped at 1.
  const score = Math.min(1, unique.length * 0.6);

  return {
    isConfused: unique.length > 0,
    matched: unique,
    score,
  };
}

/**
 * Stateful helper for tracking *consecutive* confusion on the same concept.
 * The chat route keeps this counter in Redis per session; this pure function
 * decides whether the 3+ threshold (per spec) is reached so the agent should
 * persist a confusion pattern via update_learner_profile.
 */
export function shouldEscalateConfusion(consecutiveCount: number): boolean {
  return consecutiveCount >= 3;
}
