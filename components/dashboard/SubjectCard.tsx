"use client";

import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import type { DashboardSubject } from "@/types/session";

/**
 * SubjectCard — one subject/topic in progress on the dashboard, with its
 * mastery bar and a quick-start button that jumps straight into a session.
 */
export function SubjectCard({ subject }: { subject: DashboardSubject }) {
  const href = `/learn?subject=${encodeURIComponent(subject.subject)}&topic=${encodeURIComponent(
    subject.topic
  )}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-fg">{subject.topic}</h3>
          <p className="truncate text-sm text-muted">{subject.subject}</p>
        </div>
        {subject.dueForReview && (
          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            Due for review
          </span>
        )}
      </div>

      <MasteryBar mastery={subject.masteryLevel} />

      <Link
        href={href}
        className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
      >
        {subject.dueForReview ? "Review now" : "Continue"}
      </Link>
    </div>
  );
}
