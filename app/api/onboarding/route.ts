import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getCurrentUserId } from "@/lib/auth";
import { buildOnboardingSystemPrompt } from "@/lib/agent/systemPrompt";
import { ONBOARDING_TOOLS, executeTool, type ToolExecContext } from "@/lib/agent/tools";
import { getAnthropic } from "@/lib/agent/client";
import { CLAUDE_MODEL } from "@/lib/agent/systemPrompt";
import {
  getOnboardingState,
  setOnboardingState,
  clearOnboardingState,
} from "@/lib/redis/session";
import { getOrCreateProfile } from "@/lib/db/queries";
import type { ChatMessage } from "@/types/session";

export const runtime = "nodejs";

// Keep onboarding tight — a few high-value questions, not a long interview.
const MAX_ONBOARDING_STEPS = 4;

/**
 * POST /api/onboarding
 *
 * One turn of the conversational onboarding. Onboarding messages are short, so
 * this responds with JSON (not a stream) — simpler for the step-indicator UI,
 * which needs the new step number and the completion flag alongside the reply.
 *
 * Body: { messages: ChatMessage[] }  — full client-side history
 * Returns: { reply, step, complete, summary }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  // Ensure a profile row exists so update_learner_profile has something to write.
  await getOrCreateProfile(userId);

  // Track the step in Redis. Step = number of user turns taken so far + 1.
  const prior = await getOnboardingState(userId);
  const userTurns = messages.filter((m) => m.role === "user").length;
  const step = Math.min(MAX_ONBOARDING_STEPS, Math.max(prior?.step ?? 1, userTurns));

  const system = buildOnboardingSystemPrompt(step);
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // If this is the very first turn (no messages), seed an opening prompt so the
  // agent produces its warm welcome + first question.
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: "user", content: "(The learner just arrived. Begin onboarding.)" });
  }

  const client = getAnthropic();
  const ctx: ToolExecContext = {
    userId,
    now: Date.now(),
    confusionEvents: [],
    onboardingCompleted: { value: false },
  };

  // Non-streaming tool loop (short messages; simplicity over live typing here).
  const convo = [...anthropicMessages];
  let replyText = "";
  for (let round = 0; round < 4; round++) {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system,
      tools: ONBOARDING_TOOLS,
      messages: convo,
    });

    const toolUses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    for (const block of msg.content) {
      if (block.type === "text") replyText += block.text;
    }

    if (msg.stop_reason !== "tool_use" || toolUses.length === 0) break;

    convo.push({ role: "assistant", content: msg.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await executeTool(tu.name, tu.input as Record<string, any>, ctx);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    convo.push({ role: "user", content: results });
  }

  const complete = ctx.onboardingCompleted?.value ?? false;
  const nextStep = Math.min(MAX_ONBOARDING_STEPS, step + 1);

  if (complete) {
    await clearOnboardingState(userId);
  } else {
    await setOnboardingState(userId, { step: nextStep, extracted: {} });
  }

  return NextResponse.json({
    reply: replyText.trim(),
    step: complete ? MAX_ONBOARDING_STEPS : nextStep,
    complete,
    summary: ctx.onboardingCompleted?.summary ?? null,
  });
}
