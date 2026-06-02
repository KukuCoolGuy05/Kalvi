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
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform duration-200 ease-out hover:scale-110 active:scale-95"
      >
        {/* Pulsing attention ring. Sits behind the button at rest (same size →
            invisible) and expands outward while animating. The motion-safe
            variant + the global .reduce-motion rule both quiet it for users who
            prefer reduced motion. */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary opacity-75 motion-safe:animate-ping"
          />
        )}
        {/* Icon swaps + rotates between the accessibility glyph and a close X. */}
        <span
          aria-hidden
          className={`relative transition-transform duration-300 ease-out ${
            open ? "rotate-90" : "rotate-0"
          }`}
        >
          {open ? <CloseIcon /> : <AccessibilityIcon />}
        </span>
      </button>
    </div>
  );
}

// --- Icons (clean inline SVGs, no emoji) ---

/** Universal-access figure: head, outstretched arms, torso, legs. */
function AccessibilityIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <path d="M5.5 8.5c2 .8 4.2 1.2 6.5 1.2s4.5-.4 6.5-1.2" />
      <path d="M12 9.7V14" />
      <path d="M8.5 21l3.5-7 3.5 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
