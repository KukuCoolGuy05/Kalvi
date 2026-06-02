"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COURSE_CATEGORIES,
  coursesByCategory,
  searchCourses,
  suggestCourses,
  type Course,
} from "@/lib/courses";

/**
 * AddCourseModal — a searchable course picker.
 *
 * Two browsing modes plus search:
 *  - "Suggested for you": catalog matches to the subjects the learner gave
 *    during onboarding (falls back to popular starters).
 *  - "Explore": all popular topics grouped by category (Math, Science, …).
 *  - Typing in the search bar overrides both with a flat filtered list.
 *
 * Selecting a course persists its subject to the profile, then drops the
 * learner straight into a learning session.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal, labelled by the title.
 *  - Escape closes; clicking the backdrop closes.
 *  - The search input is auto-focused on open.
 */
export function AddCourseModal({
  open,
  onClose,
  suggestedSubjects,
}: {
  open: boolean;
  onClose: () => void;
  suggestedSubjects: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"suggested" | "explore">("suggested");
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => suggestCourses(suggestedSubjects), [suggestedSubjects]);
  const results = useMemo(() => searchCourses(query), [query]);
  const searching = query.trim().length > 0;

  // Focus the search field when the modal opens; reset state when it closes.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    setQuery("");
    setTab("suggested");
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function pick(course: Course) {
    setBusyId(course.id);
    try {
      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: course.subject }),
      });
    } catch {
      /* non-fatal — still let them start learning */
    }
    router.push(
      `/learn?subject=${encodeURIComponent(course.subject)}&topic=${encodeURIComponent(course.topic)}`
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-course-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-2xl animate-fade-in flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
      >
        {/* Header + search */}
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="add-course-title" className="text-lg font-bold text-fg">
              Add a course
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-fg"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses — algebra, biology, Spanish…"
              aria-label="Search courses"
              className="w-full rounded-xl border border-border bg-bg py-2.5 pl-10 pr-3 text-fg placeholder:text-muted focus:border-primary"
            />
          </div>

          {/* Tabs (hidden while searching) */}
          {!searching && (
            <div role="tablist" aria-label="Course browsing" className="mt-3 flex gap-2">
              <TabButton active={tab === "suggested"} onClick={() => setTab("suggested")}>
                Suggested for you
              </TabButton>
              <TabButton active={tab === "explore"} onClick={() => setTab("explore")}>
                Explore popular topics
              </TabButton>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {searching ? (
            results.length > 0 ? (
              <CourseGrid courses={results} busyId={busyId} onPick={pick} />
            ) : (
              <p className="py-10 text-center text-muted">
                No courses match “{query}”. Try a broader word like “math” or “writing”.
              </p>
            )
          ) : tab === "suggested" ? (
            <div>
              <p className="mb-3 text-sm text-muted">
                {suggestedSubjects.length > 0
                  ? "Based on what you told us you want to learn."
                  : "Popular places to start."}
              </p>
              <CourseGrid courses={suggestions} busyId={busyId} onPick={pick} />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {COURSE_CATEGORIES.map((cat) => (
                <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                  <h3
                    id={`cat-${cat.id}`}
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${cat.accent}`} aria-hidden />
                    {cat.label}
                  </h3>
                  <CourseGrid courses={coursesByCategory(cat.id)} busyId={busyId} onPick={pick} />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseGrid({
  courses,
  busyId,
  onPick,
}: {
  courses: Course[];
  busyId: string | null;
  onPick: (c: Course) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {courses.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={busyId !== null}
          onClick={() => onPick(c)}
          className="group flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary hover:bg-surface-alt disabled:opacity-60"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="font-medium text-fg">{c.topic}</span>
            <span className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary">
              {busyId === c.id ? <Spinner /> : <ArrowIcon />}
            </span>
          </div>
          <span className="text-xs text-muted">{c.blurb}</span>
        </button>
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-fg"
          : "border border-border bg-surface text-fg hover:bg-surface-alt"
      }`}
    >
      {children}
    </button>
  );
}

// --- Inline icons (clean SVGs, no emoji) ---

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
    </svg>
  );
}
