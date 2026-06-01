import { Redis } from "@upstash/redis";

/**
 * Redis (Upstash) used for ephemeral session state that we don't want to hit
 * Postgres for on every chat turn:
 *  - in-flight onboarding step + partial extraction
 *  - the live conversation buffer for an active learning session
 *  - a per-session "minutes elapsed" marker for the ADHD break suggestion
 *
 * We use the REST client so it works on Vercel edge/serverless without a
 * persistent socket. All keys are namespaced and TTL'd so abandoned sessions
 * self-clean.
 */

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars."
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// TTLs in seconds.
const ONBOARDING_TTL = 60 * 60; // 1 hour
const SESSION_TTL = 60 * 60 * 6; // 6 hours

const onboardingKey = (userId: string) => `onboarding:${userId}`;
const sessionKey = (sessionId: string) => `session:${sessionId}`;
const sessionStartKey = (sessionId: string) => `session:${sessionId}:startedAt`;

// --- Onboarding state ------------------------------------------------------

export interface OnboardingState {
  step: number; // 1..7
  // Accumulated extraction so far; flushed to LearnerProfile at completion.
  extracted: Record<string, unknown>;
}

export async function getOnboardingState(
  userId: string
): Promise<OnboardingState | null> {
  return (await getRedis().get<OnboardingState>(onboardingKey(userId))) ?? null;
}

export async function setOnboardingState(
  userId: string,
  state: OnboardingState
): Promise<void> {
  await getRedis().set(onboardingKey(userId), state, { ex: ONBOARDING_TTL });
}

export async function clearOnboardingState(userId: string): Promise<void> {
  await getRedis().del(onboardingKey(userId));
}

// --- Live session buffer ---------------------------------------------------

/** Record (or return existing) wall-clock start for a session, for the timer. */
export async function markSessionStart(sessionId: string): Promise<number> {
  const r = getRedis();
  const existing = await r.get<number>(sessionStartKey(sessionId));
  if (existing) return existing;
  // Caller passes the timestamp (Date.now from the request handler) so this
  // module stays free of nondeterministic time itself.
  return existing ?? 0;
}

export async function setSessionStart(
  sessionId: string,
  startedAtMs: number
): Promise<void> {
  await getRedis().set(sessionStartKey(sessionId), startedAtMs, {
    ex: SESSION_TTL,
    nx: true, // only set if not already present
  });
}

export async function getSessionStart(
  sessionId: string
): Promise<number | null> {
  return (await getRedis().get<number>(sessionStartKey(sessionId))) ?? null;
}

export { sessionKey };
