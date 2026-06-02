"use client";

import { useState } from "react";
import { AddCourseModal } from "./AddCourseModal";

/**
 * AddCourseButton — client island the server dashboard renders. Holds the
 * modal open/close state and passes the learner's onboarding subjects through
 * so suggestions are personalized.
 */
export function AddCourseButton({
  suggestedSubjects,
  variant = "primary",
}: {
  suggestedSubjects: string[];
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
            : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-alt"
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a course
      </button>

      <AddCourseModal
        open={open}
        onClose={() => setOpen(false)}
        suggestedSubjects={suggestedSubjects}
      />
    </>
  );
}
