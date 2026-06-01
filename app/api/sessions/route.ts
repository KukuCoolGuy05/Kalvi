import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createSession, endSession, recordMastery } from "@/lib/db/queries";

export const runtime = "nodejs";

/**
 * POST /api/sessions
 *
 * Two actions, switched on `action`:
 *  - "start": create a new LearningSession, return its id.
 *  - "end":   finalize a session — store completion rate and, if provided,
 *             record/blend mastery for the topic (which reschedules review).
 *
 * Body (start): { action: "start", subject, topic }
 * Body (end):   { action: "end", sessionId, completionRate, masteryLevel? }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const now = Date.now();

  if (body.action === "start") {
    const session = await createSession(userId, body.subject, body.topic || body.subject);
    return NextResponse.json({ sessionId: session.id });
  }

  if (body.action === "end") {
    const { sessionId, completionRate, masteryLevel } = body;
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    // Confirm ownership before mutating.
    const session = await prisma.learningSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await endSession(sessionId, clamp01(Number(completionRate ?? 0)), now);

    let scheduled = null;
    if (typeof masteryLevel === "number") {
      scheduled = await recordMastery(
        userId,
        session.subject,
        session.topic,
        clamp01(masteryLevel),
        now
      );
    }

    return NextResponse.json({
      ok: true,
      nextReviewAt: scheduled?.nextReviewAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
