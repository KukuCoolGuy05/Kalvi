"use client";

import { useAccessibility, MIN_FONT, MAX_FONT } from "@/components/providers/AccessibilityProvider";

/**
 * FontToggle — two controls in one:
 *  - a dyslexia-friendly font switch (OpenDyslexic)
 *  - a font-size slider clamped to 14–22px per the accessibility spec
 */
export function FontToggle() {
  const { prefs, toggle, setPref } = useAccessibility();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={prefs.dyslexicFont}
        onClick={() => toggle("dyslexicFont")}
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-alt"
      >
        <span>Dyslexia-friendly font</span>
        <span
          aria-hidden
          className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            prefs.dyslexicFont ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`h-4 w-4 rounded-full bg-surface transition-transform ${
              prefs.dyslexicFont ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      <label className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium">
        <span className="flex items-center justify-between">
          <span>Text size</span>
          <span className="text-muted tabular-nums">{prefs.fontSize}px</span>
        </span>
        <input
          type="range"
          min={MIN_FONT}
          max={MAX_FONT}
          step={1}
          value={prefs.fontSize}
          onChange={(e) => setPref("fontSize", Number(e.target.value))}
          aria-label="Text size in pixels"
          className="accent-[rgb(var(--color-primary))]"
        />
      </label>
    </div>
  );
}
