"use client";

/**
 * StepIndicator — "Step N of 7" progress for onboarding. Renders as a labeled
 * progress bar plus dot markers. aria attributes announce progress to screen
 * readers; the visual dots are aria-hidden to avoid double announcement.
 */
export function StepIndicator({ step, total = 7 }: { step: number; total?: number }) {
  const clamped = Math.min(total, Math.max(1, step));
  const pct = Math.round((clamped / total) * 100);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
        <span>
          Step {clamped} of {total}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Onboarding step ${clamped} of ${total}`}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-alt"
      >
        <div
          className="h-2 rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
