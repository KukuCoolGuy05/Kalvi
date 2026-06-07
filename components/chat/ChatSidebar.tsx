"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddCourseModal } from "@/components/dashboard/AddCourseModal";
import { AddContentModal } from "./AddContentModal";

/**
 * ChatSidebar — left navigation rail for the full-screen learning session.
 *
 * Holds:
 *  - Home: back to the dashboard.
 *  - Your courses: the learner's enrolled subjects, each a shortcut into a
 *    session. The active subject is highlighted.
 *  - Add a course: opens the catalog picker (reused from the dashboard).
 *  - Add content: opens the slides/PDF importer.
 *
 * Responsive: a persistent rail on desktop (md+), and a slide-over drawer on
 * mobile driven by `mobileOpen` / `onClose` from the parent.
 */
export function ChatSidebar({
  subjects,
  activeSubject,
  suggestedSubjects,
  mobileOpen,
  onClose,
}: {
  subjects: string[];
  activeSubject: string;
  suggestedSubjects: string[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [courseModal, setCourseModal] = useState(false);
  const [contentModal, setContentModal] = useState(false);
  const [confirmSubject, setConfirmSubject] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function removeCourse(subject: string) {
    setRemoving(true);
    try {
      await fetch(`/api/courses?subject=${encodeURIComponent(subject)}`, {
        method: "DELETE",
      });
      // If we removed the course we're currently in, leave for the dashboard;
      // otherwise just refresh the sidebar list.
      if (subject === activeSubject) {
        router.push("/dashboard");
      } else {
        setConfirmSubject(null);
        router.refresh();
      }
    } catch {
      setRemoving(false);
      setConfirmSubject(null);
    }
  }

  const content = (
    <nav
      aria-label="Learning navigation"
      className="flex h-full w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface px-3 py-4"
    >
      {/* Brand */}
      <div className="px-2 pb-3">
        <span className="text-lg font-bold text-fg">Kalvi</span>
      </div>

      {/* Home */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
      >
        <HomeIcon />
        Home
      </Link>

      {/* Courses */}
      <p className="mt-4 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Your courses
      </p>
      <div className="flex flex-col gap-0.5">
        {subjects.length === 0 ? (
          <p className="px-2.5 py-1 text-sm text-muted">No courses yet.</p>
        ) : (
          subjects.map((s) => {
            const active = s === activeSubject;
            if (confirmSubject === s) {
              return (
                <div
                  key={s}
                  className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm"
                >
                  <p className="text-xs text-fg">
                    Remove <span className="font-semibold">{s}</span> and erase its memory?
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => removeCourse(s)}
                      disabled={removing}
                      className="rounded-md bg-warning px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {removing ? "Removing…" : "Remove"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSubject(null)}
                      disabled={removing}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-fg hover:bg-surface-alt"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={s}
                className={`group flex items-center gap-1 rounded-lg pr-1 transition ${
                  active ? "bg-primary/10" : "hover:bg-surface-alt"
                }`}
              >
                <Link
                  href={`/learn?subject=${encodeURIComponent(s)}`}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm ${
                    active ? "font-semibold text-primary" : "text-fg"
                  }`}
                >
                  <BookIcon />
                  <span className="truncate">{s}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmSubject(s)}
                  aria-label={`Remove ${s}`}
                  title="Remove course"
                  className="shrink-0 rounded-md p-1 text-muted opacity-0 hover:bg-surface hover:text-fg focus:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-1 pt-4">
        <button
          type="button"
          onClick={() => setCourseModal(true)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
        >
          <PlusIcon />
          Add a course
        </button>
        <button
          type="button"
          onClick={() => setContentModal(true)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
        >
          <FileIcon />
          Add content
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden md:flex">{content}</aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <div className="relative animate-fade-in">{content}</div>
        </div>
      )}

      <AddCourseModal
        open={courseModal}
        onClose={() => setCourseModal(false)}
        suggestedSubjects={suggestedSubjects}
      />
      <AddContentModal open={contentModal} onClose={() => setContentModal(false)} />
    </>
  );
}

// --- Inline icons ---

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
