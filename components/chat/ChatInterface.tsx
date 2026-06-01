"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { QuickReplies } from "./QuickReplies";
import { StreamingIndicator } from "./StreamingIndicator";
import { MasteryBar } from "@/components/dashboard/MasteryBar";
import { AccessibilityToolbar } from "@/components/ui/AccessibilityToolbar";
import type { ChatMessage } from "@/types/session";

/**
 * ChatInterface — the main learning screen.
 *
 * Streaming approach: we POST the full message history to /api/chat and read
 * the response body as a stream of plain-text chunks, appending each chunk to
 * the in-progress assistant message. We use a tiny hand-rolled reader instead
 * of the AI SDK's useChat so the wire format stays dead simple (plain text)
 * and we control accessibility details (aria-live, focus) precisely.
 *
 * Accessibility:
 *  - The transcript is an aria-live region so new tutor text is announced.
 *  - The composer is a labeled textarea; Enter sends, Shift+Enter newlines.
 *  - No time limit anywhere; the timer is informational only.
 */
export function ChatInterface({
  subject,
  topic,
  initialMastery = 0,
  greeting,
}: {
  subject: string;
  topic: string;
  initialMastery?: number;
  greeting?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    greeting
      ? [{ id: "greeting", role: "assistant", content: greeting }]
      : []
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const scrollRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  // Gentle, non-pressuring session timer.
  useEffect(() => {
    if (startRef.current === null) startRef.current = Date.now();
    const t = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setStreaming(true);

      // Placeholder assistant message we'll stream into.
      const assistantId = `a-${Date.now()}`;
      setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            subject,
            topic,
            sessionId,
          }),
        });

        const sid = res.headers.get("x-session-id");
        if (sid && !sessionId) setSessionId(sid);

        if (!res.body) throw new Error("No response body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, content: acc } : msg))
          );
        }
      } catch {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: "Sorry — I had trouble responding. Please try again." }
              : msg
          )
        );
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, subject, topic, sessionId]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col">
      {/* Progress / topic header */}
      <header className="border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{topic || subject}</p>
            <p className="truncate text-xs text-muted">{subject}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <MasteryBar mastery={initialMastery} size="sm" />
            </div>
            <span
              className="tabular-nums text-xs text-muted"
              aria-label={`Time in session: ${mm} minutes ${ss} seconds`}
              title="Time in this session (no rush!)"
            >
              ⏱ {mm}:{ss}
            </span>
          </div>
        </div>
      </header>

      {/* Transcript */}
      <main
        id="main"
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <div className="mt-12 text-center text-muted">
            <p className="text-lg font-medium text-fg">Ready when you are.</p>
            <p className="mt-1 text-sm">Ask a question, or just say hi to get started.</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming && messages[messages.length - 1]?.content === "" && (
          <StreamingIndicator />
        )}
      </main>

      {/* Composer + quick replies */}
      <footer className="border-t border-border bg-surface px-4 py-3">
        <div className="mb-2">
          <QuickReplies onSend={send} disabled={streaming} />
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <label htmlFor="composer" className="sr-only">
            Type your message to the tutor
          </label>
          <textarea
            id="composer"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Type your message…"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-fg placeholder:text-muted focus:border-primary"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="h-[44px] shrink-0 rounded-xl bg-primary px-4 font-medium text-primary-fg disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </footer>

      <AccessibilityToolbar />
    </div>
  );
}
