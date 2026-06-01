import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client. Cached on globalThis like Prisma so dev hot-reload
 * doesn't spin up a new client (and its keep-alive agent) on every change.
 */
const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export function getAnthropic(): Anthropic {
  if (globalForAnthropic.anthropic) return globalForAnthropic.anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY env var.");
  const client = new Anthropic({ apiKey });
  if (process.env.NODE_ENV !== "production") globalForAnthropic.anthropic = client;
  return client;
}
