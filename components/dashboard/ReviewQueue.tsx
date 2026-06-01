"use client";

import Link from "next/link";
import type { DashboardSubject } from "@/types/session";

/**
 * ReviewQueue — the "due for review" section driven by spaced repetition.
 * Empty state is deliberately encouraging rather than blank.
 */
export function ReviewQueue({ reviews }: { reviews: DashboardSubject[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
        <p className="font-medium text-fg">You&apos;re all caught up 🎉</p>
        <p className="mt-1 text-sm text-muted">
          Nothing due for review right now. Great rhythm.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {reviews.map((r) => (
        <li
          key={`${r.subject}-${r.topic}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{r.topic}</p>
            <p className="truncate text-xs text-muted">{r.subject}</p>
          </div>
          <Link
            href={`/learn?subject=${encodeURIComponent(r.subject)}&topic=${encodeURIComponent(
              r.topic
            )}`}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            Review
          </Link>
        </li>
      ))}
    </ul>
  );
}
