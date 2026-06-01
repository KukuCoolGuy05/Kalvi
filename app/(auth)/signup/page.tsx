"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Signup page. With the dev Credentials provider, "sign up" and "sign in" are
 * the same upsert under the hood; we just collect a name too so the tutor can
 * greet the learner. New users land in /onboarding (handled by the / redirect).
 */
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("email", { email, name, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Couldn't create your account. Please try again.");
    } else {
      router.push("/");
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-fg">Create your account</h1>
      <p className="mt-1 text-muted">It takes about a minute. Then we&apos;ll get to know how you learn.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label htmlFor="name" className="text-sm font-medium text-fg">
          What should we call you?
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-fg focus:border-primary"
        />

        <label htmlFor="email" className="mt-2 text-sm font-medium text-fg">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-fg focus:border-primary"
        />

        {error && (
          <p role="alert" className="text-sm text-warning">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-fg disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </main>
  );
}
