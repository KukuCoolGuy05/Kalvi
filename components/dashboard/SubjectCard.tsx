"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MasteryBar } from "./MasteryBar";

/**
 * SubjectCard — one enrolled course on the dashboard.
 *
 * Works whether or not the learner has started: a "not started" course shows a
 * Start button instead of a mastery bar. Each card can be removed, which erases
 * all memory tied to that subject (progress + saved conversations).
 */
export interface SubjectCardData {
  subject: string;
  /** Topic to continue into; falls back to the subject name. */
  topic: string;
  /** Null when the learner hasn't started this course yet. */
  masteryLevel: number | null;
}

export function SubjectCard({ data }: { data: SubjectCardData }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const started = data.masteryLevel !== null;
  const href = `/learn?subject=${encodeURIComponent(data.subject)}&topic=${encodeURIComponent(
    data.topic
  )}`;

  async function remove() {
    setRemoving(true);
    try {
      await fetch(`/api/courses?subject=${encodeURIComponent(data.subject)}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-fg">{data.subject}</h3>
          <p className="truncate text-sm text-muted">
            {started ? data.topic : "Not started yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${data.subject}`}
          title="Remove course"
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-fg"
        >
          <TrashIcon />
        </button>
      </div>

      {started && <MasteryBar mastery={data.masteryLevel ?? 0} />}

      {confirming ? (
        <div className="rounded-lg border border-border bg-bg p-3">
          <p className="text-sm text-fg">
            Remove <span className="font-semibold">{data.subject}</span>? This erases all
            progress and saved conversations for it.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="rounded-lg bg-warning px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={removing}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-alt"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <Link
          href={href}
          className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          {started ? "Continue" : "Start"}
        </Link>
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
