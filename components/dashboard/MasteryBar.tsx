"use client";

/**
 * MasteryBar — accessible progress bar for a topic's mastery (0..1).
 * Uses role="progressbar" with aria-valuenow so screen readers announce the
 * percentage. Color shifts by band but ALSO shows a text label, so meaning
 * isn't conveyed by color alone (WCAG 1.4.1).
 */
export function MasteryBar({
  mastery,
  showLabel = true,
  size = "md",
}: {
  mastery: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const pct = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
  const band =
    mastery > 0.7 ? "Strong" : mastery >= 0.4 ? "Getting there" : "Just starting";
  const barColor =
    mastery > 0.7 ? "bg-success" : mastery >= 0.4 ? "bg-primary" : "bg-warning";
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>{band}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Mastery: ${pct} percent, ${band}`}
        className={`w-full overflow-hidden rounded-full bg-surface-alt ${height}`}
      >
        <div
          className={`${height} ${barColor} rounded-full transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
