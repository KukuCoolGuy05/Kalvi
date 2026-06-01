"use client";

import type { QuickReplyAction } from "@/types/session";

/**
 * QuickReplies — the always-visible support buttons from the spec:
 *  - "I'm confused" (one tap → triggers the reteach path)
 *  - "Slow down"
 *  - "Speed up"
 *
 * Each maps to a canned user message so the learner never has to find the
 * words while stuck. The "I'm confused" button is visually emphasized because
 * it's the most important affordance for a struggling learner.
 */

const ACTIONS: {
  action: QuickReplyAction;
  label: string;
  message: string;
  emphasized?: boolean;
}[] = [
  {
    action: "confused",
    label: "I'm confused",
    message: "I'm confused — can you explain that a different way?",
    emphasized: true,
  },
  { action: "slow_down", label: "Slow down", message: "Can you slow down a bit?" },
  { action: "speed_up", label: "Speed up", message: "I've got this — we can go faster." },
];

export function QuickReplies({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Quick replies">
      {ACTIONS.map((a) => (
        <button
          key={a.action}
          type="button"
          disabled={disabled}
          onClick={() => onSend(a.message)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
            a.emphasized
              ? "border-accent bg-accent/10 text-accent hover:bg-accent/20"
              : "border-border bg-surface text-fg hover:bg-surface-alt"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
