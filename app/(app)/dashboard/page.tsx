import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile, getDashboard } from "@/lib/db/queries";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { AddCourseButton } from "@/components/dashboard/AddCourseButton";
import { AccessibilityToolbar } from "@/components/ui/AccessibilityToolbar";

/**
 * Dashboard — post-onboarding home. Server-rendered with the dashboard query
 * (welcome-back line, streak, subjects in progress, due reviews).
 */
export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const data = await getDashboard(userId, Date.now());
  const firstSubject = profile.subjects[0];

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

      {/* Due for review */}
      <section className="mt-8" aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-3 text-lg font-semibold text-fg">
          Due for review
        </h2>
        <ReviewQueue reviews={data.dueReviews} />
      </section>

      {/* Subjects in progress */}
      <section className="mt-8" aria-labelledby="subjects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="subjects-heading" className="text-lg font-semibold text-fg">
            Your subjects
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

        {data.subjects.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <p className="font-medium text-fg">No progress yet — let&apos;s change that.</p>
            <p className="mt-1 text-sm text-muted">
              Pick a course to begin, and Kalvi will start tracking what you learn.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <AddCourseButton suggestedSubjects={profile.subjects} />
              {firstSubject && (
                <Link
                  href={`/learn?subject=${encodeURIComponent(firstSubject)}`}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
                >
                  Start {firstSubject}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.subjects.map((s) => (
              <SubjectCard key={`${s.subject}-${s.topic}`} subject={s} />
            ))}
          </div>
        )}
      </section>

      <AccessibilityToolbar />
    </main>
  );
}
