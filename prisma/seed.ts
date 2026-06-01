/**
 * Seed script — creates a demo learner with a profile, some progress, and a
 * past session so the dashboard / review queue have something to show in dev.
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { nextReviewAt } from "../lib/agent/spacedRepetition";

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const user = await prisma.user.upsert({
    where: { email: "demo@kalvi.app" },
    update: {},
    create: { email: "demo@kalvi.app", name: "Sam" },
  });

  await prisma.learnerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      onboardingComplete: true,
      learningStyle: "VISUAL",
      pace: "MODERATE",
      disabilities: ["dyslexia", "adhd"],
      subjects: ["Algebra", "Spanish"],
      gradeLevel: "Grade 9",
      nativeLanguage: "English",
      preferredExplanationLength: "BRIEF",
      successPatterns: ["responds well to comparison tables", "likes real-world money examples"],
      confusionKeywords: ["wait what", "lost"],
      totalSessions: 3,
    },
  });

  // A topic that's overdue (low mastery, reviewed 2 days ago) → shows in queue.
  await prisma.progressRecord.upsert({
    where: { userId_subject_topic: { userId: user.id, subject: "Algebra", topic: "Solving for x" } },
    update: {},
    create: {
      userId: user.id,
      subject: "Algebra",
      topic: "Solving for x",
      masteryLevel: 0.35,
      lastReviewedAt: new Date(now - 2 * dayMs),
      nextReviewAt: new Date(now - dayMs), // due yesterday
      reviewCount: 2,
    },
  });

  // A stronger topic, not yet due.
  await prisma.progressRecord.upsert({
    where: { userId_subject_topic: { userId: user.id, subject: "Spanish", topic: "Present tense verbs" } },
    update: {},
    create: {
      userId: user.id,
      subject: "Spanish",
      topic: "Present tense verbs",
      masteryLevel: 0.82,
      lastReviewedAt: new Date(now - dayMs),
      nextReviewAt: nextReviewAt(0.82, now - dayMs, 3),
      reviewCount: 3,
    },
  });

  await prisma.learningSession.create({
    data: {
      userId: user.id,
      subject: "Algebra",
      topic: "Solving for x",
      startedAt: new Date(now - dayMs),
      endedAt: new Date(now - dayMs + 20 * 60 * 1000),
      messageCount: 14,
      confusionCount: 2,
      completionRate: 0.7,
      messages: [],
    },
  });

  console.log(`Seeded demo user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
