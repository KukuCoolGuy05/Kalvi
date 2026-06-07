import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { updateProfile, removeCourse } from "@/lib/db/queries";

export const runtime = "nodejs";

/**
 * POST /api/courses
 *
 * Adds a course's subject to the learner's profile so it persists on the
 * dashboard. updateProfile MERGES array fields, so re-adding an existing
 * subject is a safe no-op.
 *
 * Body: { subject: string }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject } = await req.json();
  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "subject required" }, { status: 400 });
  }

  await updateProfile(userId, { subjects: [subject] });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/courses?subject=...
 *
 * Removes the course and erases ALL memory tied to it (progress records and
 * stored session transcripts), then drops the subject from the profile.
 */
export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subject = req.nextUrl.searchParams.get("subject");
  if (!subject) {
    return NextResponse.json({ error: "subject required" }, { status: 400 });
  }

  await removeCourse(userId, subject);
  return NextResponse.json({ ok: true });
}
