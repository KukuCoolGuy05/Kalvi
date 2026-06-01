"use client";

import { useAccessibility } from "@/components/providers/AccessibilityProvider";

/**
 * ContrastToggle — high-contrast mode + reduce-motion switches.
 * Both flip a class on <html>; the actual visual change is pure CSS.
 */
export function ContrastToggle() {
  const { prefs, toggle } = useAccessibility();

  const Switch = ({
    label,
    checked,
    onClick,
  }: {
    label: string;
    checked: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-alt"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-surface transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <Switch
        label="High contrast"
        checked={prefs.highContrast}
        onClick={() => toggle("highContrast")}
      />
      <Switch
        label="Reduce motion"
        checked={prefs.reduceMotion}
        onClick={() => toggle("reduceMotion")}
      />
    </div>
  );
}
