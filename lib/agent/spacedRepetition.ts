/**
 * spacedRepetition.ts
 *
 * Spaced-repetition scheduling. The spec defines a simple mastery-banded
 * schedule (not full SM-2), which is the right call for an MVP: it's
 * predictable, explainable to the learner, and easy to tune.
 *
 *   mastery < 0.4        -> review in 1 day
 *   0.4 <= mastery <= 0.7 -> review in 3 days
 *   mastery > 0.7        -> review in 7 days
 *
 * We additionally apply a gentle multiplier based on how many times the topic
 * has already been successfully reviewed, so well-known topics drift further
 * out over time (the core insight of spaced repetition). This stays optional —
 * pass reviewCount = 0 to get exactly the spec's banded behavior.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Base interval (in days) per mastery band, straight from the spec. */
export function baseIntervalDays(masteryLevel: number): number {
  if (masteryLevel < 0.4) return 1;
  if (masteryLevel <= 0.7) return 3;
  return 7;
}

/**
 * Compute the next review date.
 *
 * @param masteryLevel 0..1
 * @param now          current time (ms since epoch) — injected so callers
 *                     control the clock and this stays pure/testable.
 * @param reviewCount  how many prior successful reviews (optional spacing boost)
 */
export function nextReviewAt(
  masteryLevel: number,
  now: number,
  reviewCount = 0
): Date {
  const base = baseIntervalDays(clamp01(masteryLevel));

  // Spacing boost: each prior review stretches the interval by 1.5x, but only
  // once the learner is past the "fragile" (<0.4) band. Capped to avoid
  // intervals so long the learner forgets entirely.
  let intervalDays = base;
  if (masteryLevel >= 0.4 && reviewCount > 0) {
    intervalDays = base * Math.pow(1.5, Math.min(reviewCount, 4));
  }

  return new Date(now + Math.round(intervalDays) * DAY_MS);
}

/** Whether a record is due for review at `now`. */
export function isDue(nextReviewAt: Date | string | null, now: number): boolean {
  if (!nextReviewAt) return false;
  const t = typeof nextReviewAt === "string" ? Date.parse(nextReviewAt) : nextReviewAt.getTime();
  return t <= now;
}

/**
 * Blend a new in-session mastery observation with the stored value.
 * We use an exponential moving average so a single bad turn doesn't tank a
 * topic the learner has demonstrated repeatedly, but recent evidence still
 * moves the needle.
 */
export function blendMastery(prev: number, observed: number, weight = 0.4): number {
  return clamp01(prev * (1 - weight) + clamp01(observed) * weight);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
