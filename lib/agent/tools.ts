import type Anthropic from "@anthropic-ai/sdk";
import {
  updateProfile,
  getProgress,
  recordMastery,
  getRecentSessionSummaries,
} from "@/lib/db/queries";
import { nextReviewAt } from "./spacedRepetition";

/**
 * tools.ts
 *
 * Defines the tool_use schemas the agent can call, plus a single executor that
 * runs a tool by name and returns a JSON-serializable result for the
 * tool_result turn.
 *
 * Why centralize: both the chat route and the onboarding route share most of
 * these tools, and the executor must validate inputs (the model can produce
 * malformed args) before touching the database.
 */

// --- Tool schemas (sent to the Anthropic API) ------------------------------

export const LEARNING_TOOLS: Anthropic.Tool[] = [
  {
    name: "update_learner_profile",
    description:
      "Update the learner's profile based on something observed mid-session: a confusion pattern (when they've shown confusion 3+ times on one concept), a demonstrated mastery, or an explicitly stated preference. Use the matching field.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: [
            "confusionKeywords",
            "successPatterns",
            "learningStyle",
            "pace",
            "preferredExplanationLength",
            "disabilities",
            "nativeLanguage",
            "gradeLevel",
          ],
          description: "Which profile field to update.",
        },
        value: {
          type: "string",
          description:
            "The value to set/append. For array fields (confusionKeywords, successPatterns, disabilities) this is appended; for enums it replaces.",
        },
      },
      required: ["field", "value"],
    },
  },
  {
    name: "get_learner_progress",
    description:
      "Retrieve the learner's mastery levels and last-review dates for a subject, to inform what to review or build on next.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Subject to fetch progress for." },
      },
      required: ["subject"],
    },
  },
  {
    name: "schedule_review",
    description:
      "Schedule the next spaced-repetition review for a topic the learner just worked on, based on their observed mastery (0.0–1.0).",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        subject: { type: "string" },
        masteryLevel: {
          type: "number",
          description: "Observed mastery 0.0–1.0. <0.4 → 1 day, 0.4–0.7 → 3 days, >0.7 → 7 days.",
        },
      },
      required: ["topic", "subject", "masteryLevel"],
    },
  },
  {
    name: "log_confusion_event",
    description:
      "Record that the learner struggled at a specific point in a topic, so future sessions on this topic can pre-empt the sticking point.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        messageIndex: {
          type: "number",
          description: "Index of the message in the current session where confusion occurred.",
        },
        note: {
          type: "string",
          description: "Short description of WHAT confused them.",
        },
      },
      required: ["topic", "note"],
    },
  },
  {
    name: "get_session_context",
    description:
      "Retrieve summaries of the learner's last 3 sessions for a subject so you can reference prior learning.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
      },
      required: ["subject"],
    },
  },
];

// The onboarding agent gets update_learner_profile plus a completion signal.
export const ONBOARDING_TOOLS: Anthropic.Tool[] = [
  LEARNING_TOOLS[0], // update_learner_profile
  {
    name: "complete_onboarding",
    description:
      "Call when the intake conversation is finished. Marks the profile complete and transitions the learner into their first session.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One-sentence friendly summary of what you learned about the learner.",
        },
      },
      required: ["summary"],
    },
  },
];

// --- Executor --------------------------------------------------------------

export interface ToolExecContext {
  userId: string;
  sessionId?: string;
  /** Injected clock (ms) so scheduling stays deterministic/testable. */
  now: number;
  /** Confusion events accumulated this request, surfaced back to the route. */
  confusionEvents: Array<{ topic: string; messageIndex?: number; note: string }>;
  /** Set true by complete_onboarding so the route can flush + redirect. */
  onboardingCompleted?: { value: boolean; summary?: string };
}

const ARRAY_FIELDS = new Set(["confusionKeywords", "successPatterns", "disabilities"]);
const ENUM_FIELDS: Record<string, string[]> = {
  learningStyle: ["VISUAL", "AUDITORY", "READING", "KINESTHETIC", "MIXED"],
  pace: ["SLOW", "MODERATE", "FAST"],
  preferredExplanationLength: ["BRIEF", "MODERATE", "DETAILED"],
};

/**
 * Execute one tool call. Always returns a string (the tool_result content).
 * Never throws to the caller — tool failures are returned as error strings so
 * the model can recover gracefully rather than the whole turn 500ing.
 */
export async function executeTool(
  name: string,
  input: Record<string, any>,
  ctx: ToolExecContext
): Promise<string> {
  try {
    switch (name) {
      case "update_learner_profile": {
        const field = String(input.field);
        const rawValue = input.value;
        if (ENUM_FIELDS[field]) {
          const v = String(rawValue).toUpperCase();
          if (!ENUM_FIELDS[field].includes(v)) {
            return `Ignored: "${rawValue}" is not a valid ${field}.`;
          }
          await updateProfile(ctx.userId, { [field]: v } as any);
          return `Updated ${field} = ${v}.`;
        }
        if (ARRAY_FIELDS.has(field)) {
          const v = String(rawValue).toLowerCase().trim();
          await updateProfile(ctx.userId, { [field]: [v] } as any);
          return `Recorded ${field}: "${v}".`;
        }
        // plain string fields
        if (field === "nativeLanguage" || field === "gradeLevel") {
          await updateProfile(ctx.userId, { [field]: String(rawValue) } as any);
          return `Updated ${field}.`;
        }
        return `Unknown field "${field}".`;
      }

      case "get_learner_progress": {
        const records = await getProgress(ctx.userId, String(input.subject));
        return JSON.stringify(
          records.map((r) => ({
            topic: r.topic,
            masteryLevel: r.masteryLevel,
            lastReviewedAt: r.lastReviewedAt.toISOString(),
            nextReviewAt: r.nextReviewAt?.toISOString() ?? null,
            reviewCount: r.reviewCount,
          }))
        );
      }

      case "schedule_review": {
        const mastery = clamp01(Number(input.masteryLevel));
        const rec = await recordMastery(
          ctx.userId,
          String(input.subject),
          String(input.topic),
          mastery,
          ctx.now
        );
        return `Scheduled review of "${rec.topic}" for ${rec.nextReviewAt?.toISOString()}. (preview: ${nextReviewAt(
          mastery,
          ctx.now
        ).toDateString()})`;
      }

      case "log_confusion_event": {
        ctx.confusionEvents.push({
          topic: String(input.topic),
          messageIndex: typeof input.messageIndex === "number" ? input.messageIndex : undefined,
          note: String(input.note),
        });
        return "Confusion event logged.";
      }

      case "get_session_context": {
        const summaries = await getRecentSessionSummaries(ctx.userId, String(input.subject), 3);
        return JSON.stringify(summaries);
      }

      case "complete_onboarding": {
        await updateProfile(ctx.userId, { onboardingComplete: true });
        if (ctx.onboardingCompleted) {
          ctx.onboardingCompleted.value = true;
          ctx.onboardingCompleted.summary = String(input.summary ?? "");
        }
        return "Onboarding marked complete.";
      }

      default:
        return `Unknown tool "${name}".`;
    }
  } catch (err) {
    return `Tool "${name}" failed: ${(err as Error).message}`;
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
