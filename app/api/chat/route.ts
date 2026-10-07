import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId } from "@/lib/auth";
import { buildLearningSystemPrompt } from "@/lib/agent/systemPrompt";
import { LEARNING_TOOLS, type ToolExecContext } from "@/lib/agent/tools";
import { runAgent } from "@/lib/agent/runner";
import { detectConfusion, shouldEscalateConfusion } from "@/lib/agent/confusionDetection";
import {
  getOrCreateProfile,
  createSession,
  appendSessionMessages,
  nudgeMastery,
} from "@/lib/db/queries";
import { kv, setSessionStart, getSessionStart } from "@/lib/redis/session";
import type { ChatMessage } from "@/types/session";

export const runtime = "nodejs";

/**
 * POST /api/chat
 *
 * The main learning-session handler. Streams Claude's response as plain text.
 *
 * Flow:
 *  1. Resolve/create the LearningSession; remember its id (returned via header).
 *  2. Fast, deterministic confusion check on the newest user message. Track a
 *     consecutive-confusion counter in Redis; at 3+ we inject a nudge telling
 *     the model to run the RETEACH protocol and persist the pattern.
 *  3. Build the dynamic system prompt from the profile + current mastery.
 *  4. Stream the agent (handles the tool-use loop internally).
 *  5. On completion, persist the updated transcript + confusion count.
 *
 * Body: { messages: ChatMessage[], subject, topic, sessionId? }
 * Response: text/plain stream. Headers: x-session-id.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as {
    messages: ChatMessage[];
    subject: string;
    topic: string;
    sessionId?: string;
  };
  const { messages, subject, topic } = body;
  if (!Array.isArray(messages) || !subject) {
    return new Response("messages and subject required", { status: 400 });
  }

  const now = Date.now();
  const profile = await getOrCreateProfile(userId);

  // Resolve the session.
  let sessionId = body.sessionId;
  if (!sessionId) {
    const session = await createSession(userId, subject, topic || subject);
    sessionId = session.id;
  }
  await setSessionStart(sessionId, now);

  // --- Confusion handling --------------------------------------------------
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const confusion = lastUser
    ? detectConfusion(lastUser.content, profile)
    : { isConfused: false, matched: [] as string[], score: 0 };

  const confusionCountKey = `session:${sessionId}:confusion`;
  let consecutive = 0;
  if (confusion.isConfused) {
    consecutive = (await kv.incr(confusionCountKey)) ?? 1;
    await kv.expire(confusionCountKey, 60 * 60 * 6);
  } else {
    await kv.del(confusionCountKey);
  }

  // --- Live mastery update -------------------------------------------------
  // Nudge the learner's level in this topic every turn so the mastery bar moves
  // as they chat: down on confusion, up on a constructive turn. The agent's
  // schedule_review (at topic boundaries) still refines it. We compute this
  // before streaming so the new value can ride back on a response header.
  const resolvedTopic = topic || subject;
  const hasUserTurn = Boolean(lastUser);
  const direction: "up" | "down" | "none" = !hasUserTurn
    ? "none"
    : confusion.isConfused
      ? "down"
      : "up";
  const newMastery = await nudgeMastery(userId, subject, resolvedTopic, direction, now);

  // Build the message list. If confusion has escalated (3+ in a row on the same
  // concept), inject a system-style nudge as a leading user note so the model
  // both reteaches AND records the pattern via update_learner_profile.
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  if (confusion.isConfused && shouldEscalateConfusion(consecutive)) {
    anthropicMessages.push({
      role: "user",
      content:
        "(System note: the learner has now signaled confusion 3+ times in a row on this concept. Run the RETEACH protocol with a brand-new modality, and call update_learner_profile to record this confusion pattern and log_confusion_event for this topic.)",
    });
  } else if (confusion.isConfused) {
    anthropicMessages.push({
      role: "user",
      content: "(System note: the learner just signaled confusion — run the RETEACH protocol.)",
    });
  }

  // ADHD break suggestion: if profile includes adhd and >15 min elapsed.
  const startedAt = (await getSessionStart(sessionId)) ?? now;
  const minutesElapsed = (now - startedAt) / 60000;
  if (profile.disabilities.includes("adhd") && minutesElapsed > 15) {
    anthropicMessages.push({
      role: "user",
      content:
        "(System note: this ADHD learner has been going ~15+ minutes. After your answer, gently suggest a 2-minute break.)",
    });
  }

  const system = buildLearningSystemPrompt({
    name: profile && (await profileName(userId)) || "there",
    subject,
    topic: resolvedTopic,
    profile,
    masteryLevel: newMastery,
  });

  // --- Stream the agent ----------------------------------------------------
  const encoder = new TextEncoder();
  const ctx: ToolExecContext = {
    userId,
    sessionId,
    now,
    confusionEvents: [],
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await runAgent({
          system,
          messages: anthropicMessages,
          tools: LEARNING_TOOLS,
          ctx,
          maxTokens: 1024,
          onText: (delta) => controller.enqueue(encoder.encode(delta)),
        });

        // Persist the transcript including the assistant's new reply.
        const finalMessages: ChatMessage[] = [
          ...messages,
          {
            id: `a-${now}`,
            role: "assistant",
            content: result.text,
            reteach: confusion.isConfused,
          },
        ];
        await appendSessionMessages(
          sessionId!,
          finalMessages,
          confusion.isConfused ? 1 : 0
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            "\n\n⚠️ Something went wrong on my end. Let's try that again in a moment."
          )
        );
        console.error("chat route error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-session-id": sessionId,
      // Updated level in this topic (0..1), so the client can move the bar live.
      "x-mastery": newMastery.toFixed(4),
    },
  });
}

// Small helper: fetch the user's display name for the prompt.
async function profileName(userId: string): Promise<string | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name ?? null;
}
