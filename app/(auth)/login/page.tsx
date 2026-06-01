"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Login page. Email sign-in (dev passwordless Credentials provider) plus a
 * Google button that only does something if Google is configured server-side.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("email", { email, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Couldn't sign you in. Check your email address and try again.");
    } else {
      router.push("/");
    }
  }

  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-fg">Welcome back</h1>
      <p className="mt-1 text-muted">Sign in to keep learning.</p>

      <form onSubmit={handleEmail} className="mt-6 flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium text-fg">
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
          {loading ? "Signing in…" : "Continue with email"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="rounded-xl border border-border bg-surface px-4 py-2.5 font-medium text-fg hover:bg-surface-alt"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </main>
  );
}
