import { Redis } from "@upstash/redis";

/**
 * Ephemeral session state we don't want to hit Postgres for on every turn:
 *  - in-flight onboarding step
 *  - a per-session "minutes elapsed" marker for the ADHD break suggestion
 *  - the consecutive-confusion counter
 *
 * Backed by Upstash Redis when configured and reachable. If Upstash is missing
 * or unreachable (e.g. local dev without credentials, or a dead/rotated URL),
 * every operation transparently falls back to an in-process in-memory store so
 * the app keeps working. The fallback isn't shared across server instances or
 * durable across restarts — fine for this short-lived, best-effort data.
 */

interface SetOpts {
  ex?: number; // expire seconds
  nx?: boolean; // set only if not present
}

// --- In-memory fallback store ----------------------------------------------

const mem = new Map<string, { value: unknown; expireAt: number | null }>();

function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expireAt !== null && e.expireAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}

function memSet(key: string, value: unknown, opts?: SetOpts): "OK" | null {
  if (opts?.nx && memGet(key) !== null) return null;
  mem.set(key, {
    value,
    expireAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
  });
  return "OK";
}

function memIncr(key: string): number {
  const current = Number(memGet<number>(key) ?? 0) + 1;
  const existing = mem.get(key);
  mem.set(key, { value: current, expireAt: existing?.expireAt ?? null });
  return current;
}

function memExpire(key: string, seconds: number): void {
  const e = mem.get(key);
  if (e) e.expireAt = Date.now() + seconds * 1000;
}

// --- Redis client (lazy) ---------------------------------------------------

let _redis: Redis | null = null;
let redisHealthy = true; // flips to false after the first failure

function rawRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!_redis) _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Run an operation against Redis, falling back to the in-memory equivalent on
 * any error (or when Redis isn't configured). After the first failure we stop
 * trying Redis for the rest of the process lifetime so we don't pay the failing
 * round-trip on every call.
 */
async function withRedis<T>(
  op: (r: Redis) => Promise<T>,
  fallback: () => T
): Promise<T> {
  const r = redisHealthy ? rawRedis() : null;
  if (!r) return fallback();
  try {
    return await op(r);
  } catch (err) {
    if (redisHealthy) {
      redisHealthy = false;
      console.warn(
        `[kv] Upstash Redis unreachable — using in-memory fallback. (${(err as Error).message})`
      );
    }
    return fallback();
  }
}

/** Minimal key-value facade used across the app. Never throws on Redis errors. */
export const kv = {
  get: <T>(key: string): Promise<T | null> =>
    withRedis((r) => r.get<T>(key), () => memGet<T>(key)),
  set: (key: string, value: unknown, opts?: SetOpts): Promise<unknown> =>
    withRedis(
      (r) => r.set(key, value as never, opts as never),
      () => memSet(key, value, opts)
    ),
  del: (key: string): Promise<void> =>
    withRedis(
      async (r) => {
        await r.del(key);
      },
      () => {
        mem.delete(key);
      }
    ),
  incr: (key: string): Promise<number> =>
    withRedis((r) => r.incr(key), () => memIncr(key)),
  expire: (key: string, seconds: number): Promise<void> =>
    withRedis(
      async (r) => {
        await r.expire(key, seconds);
      },
      () => memExpire(key, seconds)
    ),
};

// --- TTLs & key helpers ----------------------------------------------------

const ONBOARDING_TTL = 60 * 60; // 1 hour
const SESSION_TTL = 60 * 60 * 6; // 6 hours

const onboardingKey = (userId: string) => `onboarding:${userId}`;
const sessionKey = (sessionId: string) => `session:${sessionId}`;
const sessionStartKey = (sessionId: string) => `session:${sessionId}:startedAt`;

// --- Onboarding state ------------------------------------------------------

export interface OnboardingState {
  step: number;
  extracted: Record<string, unknown>;
}

export async function getOnboardingState(
  userId: string
): Promise<OnboardingState | null> {
  return (await kv.get<OnboardingState>(onboardingKey(userId))) ?? null;
}

export async function setOnboardingState(
  userId: string,
  state: OnboardingState
): Promise<void> {
  await kv.set(onboardingKey(userId), state, { ex: ONBOARDING_TTL });
}

export async function clearOnboardingState(userId: string): Promise<void> {
  await kv.del(onboardingKey(userId));
}

// --- Session start marker (for the ADHD break timer) -----------------------

export async function setSessionStart(
  sessionId: string,
  startedAtMs: number
): Promise<void> {
  await kv.set(sessionStartKey(sessionId), startedAtMs, {
    ex: SESSION_TTL,
    nx: true, // keep the earliest start
  });
}

export async function getSessionStart(
  sessionId: string
): Promise<number | null> {
  return (await kv.get<number>(sessionStartKey(sessionId))) ?? null;
}

export { sessionKey };
