"use client";

import { useState } from "react";
import { FontToggle } from "./FontToggle";
import { ContrastToggle } from "./ContrastToggle";

/**
 * AccessibilityToolbar — a floating, always-reachable control that opens a
 * small panel of accessibility switches. Present on every learning/onboarding
 * screen so the learner can adjust at any moment without leaving the lesson.
 *
 * Keyboard + screen-reader notes:
 *  - The trigger is a real <button> with aria-expanded.
 *  - The panel is labeled and its controls are focusable in order.
 */
export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          className="mb-2 w-72 animate-fade-in rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          <h2 className="mb-2 text-sm font-semibold text-fg">Accessibility</h2>
          <div className="flex flex-col gap-3">
            <FontToggle />
            <ContrastToggle />
          </div>
          <p className="mt-3 text-xs text-muted">
            These settings are saved on this device and apply everywhere in Kalvi.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close accessibility settings" : "Open accessibility settings"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg hover:opacity-90"
      >
        {/* Universal access glyph */}
        <span aria-hidden className="text-xl font-bold">
          ♿
        </span>
      </button>
    </div>
  );
}
