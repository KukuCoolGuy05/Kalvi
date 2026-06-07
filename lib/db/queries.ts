import { prisma } from "./prisma";
import { nextReviewAt, blendMastery, isDue } from "@/lib/agent/spacedRepetition";
import type { LearnerProfileData } from "@/types/learner";
import type {
  ChatMessage,
  DashboardData,
  DashboardSubject,
  SessionSummary,
} from "@/types/session";

/**
 * queries.ts — the data-access layer.
 *
 * All Prisma access for the app lives here (route handlers and the agent tool
 * executors call into these). Centralizing it keeps the spaced-repetition and
 * mastery-blending logic consistent no matter who triggers an update.
 */

// --- Users & profiles ------------------------------------------------------

export async function getOrCreateUserByEmail(email: string, name?: string | null) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: name ?? null },
  });
}

export async function getProfile(userId: string): Promise<LearnerProfileData | null> {
  const p = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (!p) return null;
  return toProfileData(p);
}

export async function getOrCreateProfile(userId: string): Promise<LearnerProfileData> {
  const existing = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (existing) return toProfileData(existing);
  const created = await prisma.learnerProfile.create({ data: { userId } });
  return toProfileData(created);
}

/**
 * Apply a partial update to a profile. Array fields (disabilities, subjects,
 * confusionKeywords, successPatterns) are MERGED (union) rather than replaced,
 * since the agent learns these incrementally and shouldn't clobber prior data.
 */
export async function updateProfile(
  userId: string,
  patch: Partial<{
    onboardingComplete: boolean;
    learningStyle: LearnerProfileData["learningStyle"];
    pace: LearnerProfileData["pace"];
    preferredExplanationLength: LearnerProfileData["preferredExplanationLength"];
    gradeLevel: string;
    nativeLanguage: string;
    disabilities: string[];
    subjects: string[];
    confusionKeywords: string[];
    successPatterns: string[];
  }>
): Promise<LearnerProfileData> {
  const current = await prisma.learnerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const mergedArray = (existing: string[], incoming?: string[]) =>
    incoming ? Array.from(new Set([...existing, ...incoming.map((s) => s.trim()).filter(Boolean)])) : existing;

  const updated = await prisma.learnerProfile.update({
    where: { userId },
    data: {
      onboardingComplete: patch.onboardingComplete ?? undefined,
      learningStyle: patch.learningStyle ?? undefined,
      pace: patch.pace ?? undefined,
      preferredExplanationLength: patch.preferredExplanationLength ?? undefined,
      gradeLevel: patch.gradeLevel ?? undefined,
      nativeLanguage: patch.nativeLanguage ?? undefined,
      disabilities: mergedArray(current.disabilities, patch.disabilities),
      subjects: mergedArray(current.subjects, patch.subjects),
      confusionKeywords: mergedArray(current.confusionKeywords, patch.confusionKeywords),
      successPatterns: mergedArray(current.successPatterns, patch.successPatterns),
    },
  });
  return toProfileData(updated);
}

// --- Progress / spaced repetition ------------------------------------------

export async function getProgress(userId: string, subject?: string) {
  return prisma.progressRecord.findMany({
    where: { userId, ...(subject ? { subject } : {}) },
    orderBy: { lastReviewedAt: "desc" },
  });
}

/**
 * Record an observed mastery level for a topic and (re)schedule its next
 * review. Blends with the previous value via EMA so single turns don't whipsaw
 * the schedule.
 */
export async function recordMastery(
  userId: string,
  subject: string,
  topic: string,
  observedMastery: number,
  now: number
) {
  const existing = await prisma.progressRecord.findUnique({
    where: { userId_subject_topic: { userId, subject, topic } },
  });

  const prevMastery = existing?.masteryLevel ?? 0;
  const reviewCount = (existing?.reviewCount ?? 0) + 1;
  const mastery = existing ? blendMastery(prevMastery, observedMastery) : observedMastery;
  const next = nextReviewAt(mastery, now, reviewCount);

  return prisma.progressRecord.upsert({
    where: { userId_subject_topic: { userId, subject, topic } },
    update: {
      masteryLevel: mastery,
      lastReviewedAt: new Date(now),
      nextReviewAt: next,
      reviewCount,
    },
    create: {
      userId,
      subject,
      topic,
      masteryLevel: mastery,
      lastReviewedAt: new Date(now),
      nextReviewAt: next,
      reviewCount: 1,
    },
  });
}

// --- Sessions --------------------------------------------------------------

export async function createSession(userId: string, subject: string, topic: string) {
  // Bump the learner's lifetime session counter alongside creating the row.
  await prisma.learnerProfile.update({
    where: { userId },
    data: { totalSessions: { increment: 1 } },
  }).catch(() => {/* profile may not exist yet during onboarding; ignore */});

  return prisma.learningSession.create({
    data: { userId, subject, topic, messages: [] },
  });
}

export async function appendSessionMessages(
  sessionId: string,
  messages: unknown[],
  confusionDelta = 0
) {
  return prisma.learningSession.update({
    where: { id: sessionId },
    data: {
      messages: messages as any,
      messageCount: messages.length,
      confusionCount: { increment: confusionDelta },
    },
  });
}

export async function endSession(
  sessionId: string,
  completionRate: number,
  now: number
) {
  return prisma.learningSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(now), completionRate },
  });
}

/**
 * The most recent session for a (subject, topic), used to RESUME a conversation
 * when the learner returns to a course. Returns the stored transcript so the
 * chat can rehydrate exactly where they left off.
 */
export async function getLatestSession(
  userId: string,
  subject: string,
  topic: string
): Promise<{ id: string; messages: ChatMessage[] } | null> {
  const s = await prisma.learningSession.findFirst({
    where: { userId, subject, topic },
    orderBy: { startedAt: "desc" },
  });
  if (!s) return null;
  const messages = Array.isArray(s.messages) ? (s.messages as unknown as ChatMessage[]) : [];
  return { id: s.id, messages };
}

/**
 * Remove a course and ERASE all memory tied to it: every progress record and
 * stored session transcript for that subject, plus the subject on the profile.
 * This is destructive and intentional — the learner asked to forget it.
 */
export async function removeCourse(userId: string, subject: string): Promise<void> {
  await prisma.$transaction([
    prisma.progressRecord.deleteMany({ where: { userId, subject } }),
    prisma.learningSession.deleteMany({ where: { userId, subject } }),
  ]);
  const profile = await prisma.learnerProfile.findUnique({ where: { userId } });
  if (profile) {
    await prisma.learnerProfile.update({
      where: { userId },
      data: { subjects: profile.subjects.filter((s) => s !== subject) },
    });
  }
}

/** Last N session summaries for a subject, for get_session_context. */
export async function getRecentSessionSummaries(
  userId: string,
  subject: string,
  limit = 3
): Promise<SessionSummary[]> {
  const rows = await prisma.learningSession.findMany({
    where: { userId, subject },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    topic: r.topic,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString() ?? null,
    messageCount: r.messageCount,
    confusionCount: r.confusionCount,
    completionRate: r.completionRate,
  }));
}

// --- Dashboard -------------------------------------------------------------

export async function getDashboard(userId: string, now: number): Promise<DashboardData> {
  const [user, progress, lastSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.progressRecord.findMany({ where: { userId }, orderBy: { lastReviewedAt: "desc" } }),
    prisma.learningSession.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const subjects: DashboardSubject[] = progress.map((p) => ({
    subject: p.subject,
    topic: p.topic,
    masteryLevel: p.masteryLevel,
    lastReviewedAt: p.lastReviewedAt.toISOString(),
    nextReviewAt: p.nextReviewAt?.toISOString() ?? null,
    reviewCount: p.reviewCount,
    dueForReview: isDue(p.nextReviewAt, now),
  }));

  const lastSessionSummary = lastSession
    ? `Last time you worked on ${lastSession.topic} in ${lastSession.subject}.`
    : null;

  return {
    name: user?.name ?? null,
    streak: await computeStreak(userId, now),
    lastSessionSummary,
    subjects,
    dueReviews: subjects.filter((s) => s.dueForReview),
  };
}

/**
 * Streak = consecutive calendar days (ending today) with >=1 session.
 * Computed from session startedAt timestamps. Days are bucketed in UTC for
 * simplicity; a production version would use the learner's timezone.
 */
async function computeStreak(userId: string, now: number): Promise<number> {
  const sessions = await prisma.learningSession.findMany({
    where: { userId },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
    take: 365,
  });
  if (sessions.length === 0) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const dayIndex = (t: number) => Math.floor(t / dayMs);
  const today = dayIndex(now);
  const activeDays = new Set(sessions.map((s) => dayIndex(s.startedAt.getTime())));

  // Allow the streak to count from today OR yesterday (so an early-morning
  // dashboard visit before today's session doesn't reset the streak).
  let cursor = activeDays.has(today) ? today : today - 1;
  if (!activeDays.has(cursor)) return 0;

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

// --- mapping helper --------------------------------------------------------

function toProfileData(p: {
  id: string;
  userId: string;
  onboardingComplete: boolean;
  learningStyle: LearnerProfileData["learningStyle"];
  pace: LearnerProfileData["pace"];
  disabilities: string[];
  subjects: string[];
  gradeLevel: string | null;
  nativeLanguage: string;
  preferredExplanationLength: LearnerProfileData["preferredExplanationLength"];
  confusionKeywords: string[];
  successPatterns: string[];
  totalSessions: number;
}): LearnerProfileData {
  return {
    id: p.id,
    userId: p.userId,
    onboardingComplete: p.onboardingComplete,
    learningStyle: p.learningStyle,
    pace: p.pace,
    disabilities: p.disabilities,
    subjects: p.subjects,
    gradeLevel: p.gradeLevel,
    nativeLanguage: p.nativeLanguage,
    preferredExplanationLength: p.preferredExplanationLength,
    confusionKeywords: p.confusionKeywords,
    successPatterns: p.successPatterns,
    totalSessions: p.totalSessions,
  };
}
