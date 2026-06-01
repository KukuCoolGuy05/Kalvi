import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getProgress } from "@/lib/db/queries";
import { isDue } from "@/lib/agent/spacedRepetition";

export const runtime = "nodejs";

/**
 * GET /api/progress?subject=optional
 *
 * Returns all ProgressRecords for the signed-in user with their spaced-
 * repetition schedule and a computed `dueForReview` flag. (The spec lists a
 * /:userId path param, but we derive the user from the session for security —
 * a user can only read their own progress.)
 */
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subject = req.nextUrl.searchParams.get("subject") ?? undefined;
  const now = Date.now();
  const records = await getProgress(userId, subject);

  return NextResponse.json({
    records: records.map((r) => ({
      id: r.id,
      subject: r.subject,
      topic: r.topic,
      masteryLevel: r.masteryLevel,
      lastReviewedAt: r.lastReviewedAt.toISOString(),
      nextReviewAt: r.nextReviewAt?.toISOString() ?? null,
      reviewCount: r.reviewCount,
      dueForReview: isDue(r.nextReviewAt, now),
    })),
  });
}
