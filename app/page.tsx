import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/lib/db/queries";

/**
 * Landing / redirect.
 * - Signed-in + onboarded  -> /dashboard
 * - Signed-in + not onboarded -> /onboarding
 * - Signed-out -> marketing splash with a sign-in CTA
 */
export default async function Home() {
  const userId = await getCurrentUserId();
  if (userId) {
    const profile = await getProfile(userId);
    redirect(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }

  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
        Learning that adapts to you
      </span>
      <h1 className="text-4xl font-bold leading-tight text-fg sm:text-5xl">
        A tutor that learns <span className="text-primary">how you learn</span>.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
        Kalvi is an AI tutor that adapts in real time to your learning style — with
        first-class support for dyslexia, ADHD, learning English as a second
        language, and other learning differences.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-fg hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-border bg-surface px-6 py-3 font-medium text-fg hover:bg-surface-alt"
        >
          I already have an account
        </Link>
      </div>
      <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        {[
          ["Built for differences", "Dyslexia, ADHD, ESL and more — accommodations baked into every explanation."],
          ["Notices when you're stuck", "Confused? One tap and it re-teaches a completely different way."],
          ["Remembers what works", "It learns your patterns and schedules smart reviews so things stick."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold text-fg">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
