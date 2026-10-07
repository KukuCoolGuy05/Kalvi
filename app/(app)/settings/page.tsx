"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FontToggle } from "@/components/ui/FontToggle";
import { ContrastToggle } from "@/components/ui/ContrastToggle";
import type {
  LearnerProfileData,
  LearningStyle,
  Pace,
  ExplanationLength,
} from "@/types/learner";

const LEARNING_STYLES: LearningStyle[] = ["VISUAL", "AUDITORY", "READING", "KINESTHETIC", "MIXED"];
const PACES: Pace[] = ["SLOW", "MODERATE", "FAST"];
const LENGTHS: ExplanationLength[] = ["BRIEF", "MODERATE", "DETAILED"];
const KNOWN_DISABILITIES = ["dyslexia", "adhd", "esl", "dyscalculia", "dysgraphia"];

/**
 * Settings / profile page.
 * - Edit the learner profile (the same fields the agent personalizes from).
 * - Toggle accessibility modes manually (these live in AccessibilityProvider).
 * - Notification preferences for review reminders (stored locally for the MVP).
 */
export default function SettingsPage() {
  const [profile, setProfile] = useState<LearnerProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifyReviews, setNotifyReviews] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => setProfile(null));
    try {
      setNotifyReviews(localStorage.getItem("kalvi:notifyReviews") !== "false");
    } catch {
      /* ignore */
    }
  }, []);

  function update<K extends keyof LearnerProfileData>(key: K, value: LearnerProfileData[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  function toggleDisability(tag: string) {
    if (!profile) return;
    const has = profile.disabilities.includes(tag);
    update(
      "disabilities",
      has ? profile.disabilities.filter((d) => d !== tag) : [...profile.disabilities, tag]
    );
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        learningStyle: profile.learningStyle,
        pace: profile.pace,
        preferredExplanationLength: profile.preferredExplanationLength,
        gradeLevel: profile.gradeLevel,
        nativeLanguage: profile.nativeLanguage,
        disabilities: profile.disabilities,
        subjects: profile.subjects,
      }),
    });
    try {
      localStorage.setItem("kalvi:notifyReviews", String(notifyReviews));
    } catch {
      /* ignore */
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <main id="main" className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <Link href="/dashboard" className="text-sm text-primary underline underline-offset-2">
          ← Back to dashboard
        </Link>
      </div>

      {/* Accessibility */}
      <section className="mb-8" aria-labelledby="a11y-heading">
        <h2 id="a11y-heading" className="mb-3 text-lg font-semibold text-fg">
          Accessibility
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FontToggle />
          <ContrastToggle />
        </div>
      </section>

      {/* Learner profile */}
      <section className="mb-8" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="mb-3 text-lg font-semibold text-fg">
          How you learn
        </h2>

        {!profile ? (
          <p className="text-muted">Loading your profile…</p>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
            <Field label="Learning style">
              <Select
                value={profile.learningStyle}
                options={LEARNING_STYLES}
                onChange={(v) => update("learningStyle", v as LearningStyle)}
              />
            </Field>

            <Field label="Pace">
              <Select
                value={profile.pace}
                options={PACES}
                onChange={(v) => update("pace", v as Pace)}
              />
            </Field>

            <Field label="Explanation length">
              <Select
                value={profile.preferredExplanationLength}
                options={LENGTHS}
                onChange={(v) => update("preferredExplanationLength", v as ExplanationLength)}
              />
            </Field>

            <Field label="Native language">
              <input
                value={profile.nativeLanguage}
                onChange={(e) => update("nativeLanguage", e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-fg focus:border-primary"
              />
            </Field>

            <Field label="Current level / grade">
              <input
                value={profile.gradeLevel ?? ""}
                onChange={(e) => update("gradeLevel", e.target.value)}
                placeholder="e.g. beginner, Grade 9, college"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-fg focus:border-primary"
              />
            </Field>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-fg">
                Approaches that work better for you
              </legend>
              <div className="flex flex-wrap gap-2">
                {KNOWN_DISABILITIES.map((tag) => {
                  const active = profile.disabilities.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      role="switch"
                      aria-checked={active}
                      onClick={() => toggleDisability(tag)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${
                        active
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface text-fg hover:bg-surface-alt"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted">
                Turning these on tailors how the tutor explains things. Entirely optional.
              </p>
            </fieldset>

            <Field label="Courses (comma separated)">
              <input
                value={profile.subjects.join(", ")}
                onChange={(e) =>
                  update(
                    "subjects",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-fg focus:border-primary"
              />
            </Field>
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="mb-8" aria-labelledby="notify-heading">
        <h2 id="notify-heading" className="mb-3 text-lg font-semibold text-fg">
          Notifications
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={notifyReviews}
          onClick={() => {
            setNotifyReviews((v) => !v);
            setSaved(false);
          }}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium"
        >
          <span>Remind me when topics are due for review</span>
          <span
            aria-hidden
            className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              notifyReviews ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-surface transition-transform ${
                notifyReviews ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !profile}
          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-fg disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-success">
            Saved ✓
          </span>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="ml-auto text-sm text-muted underline underline-offset-2 hover:text-fg"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-fg focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.charAt(0) + o.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}
