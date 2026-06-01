"use client";

import type { ChatMessage } from "@/types/session";

/**
 * MessageBubble — one chat turn.
 *  - Agent (assistant) bubbles sit on the LEFT with a subtle surface bg.
 *  - User bubbles sit on the RIGHT with the primary color.
 *
 * We deliberately keep markdown-ish content as preformatted-friendly text:
 * `whitespace-pre-wrap` preserves the bullet lists / ASCII diagrams / numbered
 * steps that the adaptive rules ask the model to produce, which matters a lot
 * for dyslexic and visual learners.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-primary text-primary-fg"
            : "rounded-bl-sm border border-border bg-surface text-fg"
        }`}
      >
        {/* Screen readers announce who is speaking. */}
        <span className="sr-only">{isUser ? "You said:" : "Tutor said:"}</span>
        {message.reteach && !isUser && (
          <span className="mb-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
            Let&apos;s try this a different way
          </span>
        )}
        <div className="whitespace-pre-wrap break-words text-[1em]">{message.content}</div>
      </div>
    </div>
  );
}
