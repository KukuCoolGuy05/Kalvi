import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getDashboard } from "@/lib/db/queries";

export const runtime = "nodejs";

/**
 * GET /api/dashboard
 *
 * Returns the dashboard payload for the signed-in user: name, streak, a
 * "welcome back" reference to the last session, all subjects-in-progress with
 * mastery, and the spaced-repetition review queue.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getDashboard(userId, Date.now());
  return NextResponse.json(data);
}
