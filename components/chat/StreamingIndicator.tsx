"use client";

/**
 * StreamingIndicator — three gently pulsing dots shown while the tutor is
 * "thinking"/streaming. Uses the pulse-dot animation, which is disabled
 * automatically under reduce-motion (see globals.css).
 */
export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2" aria-live="polite" aria-label="Tutor is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-pulse-dot rounded-full bg-muted"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
      <span className="sr-only">The tutor is responding…</span>
    </div>
  );
}
