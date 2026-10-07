import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile, getDashboard } from "@/lib/db/queries";
import { SubjectCard, type SubjectCardData } from "@/components/dashboard/SubjectCard";
import { AddCourseButton } from "@/components/dashboard/AddCourseButton";
import { AccessibilityToolbar } from "@/components/ui/AccessibilityToolbar";

/**
 * Dashboard — post-onboarding home. Server-rendered with the dashboard query
 * (welcome-back line, streak, enrolled subjects).
 */
export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Fetch profile + dashboard in parallel (they don't depend on each other) to
  // save a round-trip to the remote DB.
  const [profile, data] = await Promise.all([
    getProfile(userId),
    getDashboard(userId, Date.now()),
  ]);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const firstSubject = profile.subjects[0];

  // Build one card per enrolled course.
  //  - Courses with recorded mastery show their highest-mastery topic.
  //  - Courses the learner has started a session on (but no mastery yet) show
  //    "Continue" at 0% rather than "Not started".
  //  - Courses added but never opened show "Not started".
  const bestBySubject = new Map<string, { topic: string; masteryLevel: number }>();
  for (const s of data.subjects) {
    const existing = bestBySubject.get(s.subject);
    if (!existing || s.masteryLevel > existing.masteryLevel) {
      bestBySubject.set(s.subject, { topic: s.topic, masteryLevel: s.masteryLevel });
    }
  }
  const startedTopicBySubject = new Map(
    data.startedSubjects.map((s) => [s.subject, s.topic])
  );
  const allSubjects = Array.from(
    new Set([
      ...profile.subjects,
      ...data.subjects.map((s) => s.subject),
      ...data.startedSubjects.map((s) => s.subject),
    ])
  );
  const cards: SubjectCardData[] = allSubjects.map((subject) => {
    const best = bestBySubject.get(subject);
    const startedTopic = startedTopicBySubject.get(subject);
    // Mastery: real value if recorded, else 0 if started (a session exists),
    // else null (never opened → "Not started").
    const masteryLevel =
      best?.masteryLevel ?? (startedTopic !== undefined ? 0 : null);
    return {
      subject,
      topic: best?.topic ?? startedTopic ?? subject,
      masteryLevel,
    };
  });

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">
            {data.name ? `Welcome back, ${data.name}` : "Welcome back"}
          </h1>
          {data.lastSessionSummary && (
            <p className="mt-1 text-muted">{data.lastSessionSummary}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium"
            title="Days in a row you've learned"
          >
            <span aria-hidden>🔥</span>
            <span>
              {data.streak} day{data.streak === 1 ? "" : "s"}
            </span>
            <span className="sr-only">learning streak</span>
          </div>
          <AddCourseButton suggestedSubjects={profile.subjects} />
          <Link
            href="/settings"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-alt"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Subjects */}
      <section className="mt-8" aria-labelledby="courses-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="courses-heading" className="text-lg font-semibold text-fg">
            Your courses
          </h2>
          {firstSubject && (
            <Link
              href={`/learn?subject=${encodeURIComponent(firstSubject)}`}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
            >
              Start learning
            </Link>
          )}
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <p className="font-medium text-fg">No courses yet — let&apos;s change that.</p>
            <p className="mt-1 text-sm text-muted">
              Pick a course to begin, and Kalvi will start tracking what you learn.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <AddCourseButton suggestedSubjects={profile.subjects} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <SubjectCard key={c.subject} data={c} />
            ))}
          </div>
        )}
      </section>

      <AccessibilityToolbar />
    </main>
  );
}
