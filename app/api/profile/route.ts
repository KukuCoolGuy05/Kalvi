import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/lib/db/queries";

export const runtime = "nodejs";

/** GET /api/profile — the signed-in user's learner profile. */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);
  return NextResponse.json({ profile });
}

/**
 * PATCH /api/profile — edit profile fields from the settings page.
 *
 * For scalar/enum fields we replace; for array fields the query layer merges.
 * To allow REPLACING arrays from the settings UI (e.g. removing a disability),
 * we set them directly here via Prisma-friendly full replacement when the
 * caller passes `replaceArrays: true`.
 */
export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // For settings edits we want authoritative replacement of arrays, so we go
  // through Prisma directly for those rather than the merge-on-write helper.
  const { prisma } = await import("@/lib/db/prisma");
  await prisma.learnerProfile.update({
    where: { userId },
    data: {
      learningStyle: body.learningStyle ?? undefined,
      pace: body.pace ?? undefined,
      preferredExplanationLength: body.preferredExplanationLength ?? undefined,
      gradeLevel: body.gradeLevel ?? undefined,
      nativeLanguage: body.nativeLanguage ?? undefined,
      disabilities: Array.isArray(body.disabilities) ? body.disabilities : undefined,
      subjects: Array.isArray(body.subjects) ? body.subjects : undefined,
    },
  });

  const profile = await getProfile(userId);
  return NextResponse.json({ profile });
}
