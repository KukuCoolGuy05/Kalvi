"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { QuickReplies } from "./QuickReplies";
import { StreamingIndicator } from "./StreamingIndicator";
import { ChatSidebar } from "./ChatSidebar";
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
  initialMessages,
  initialSessionId = null,
  subjects = [],
  suggestedSubjects = [],
}: {
  subject: string;
  topic: string;
  initialMastery?: number;
  greeting?: string;
  /** A resumed transcript for this course, if one exists. */
  initialMessages?: ChatMessage[];
  /** The session id to keep appending to when resuming. */
  initialSessionId?: string | null;
  /** The learner's enrolled subjects, for the sidebar course list. */
  subjects?: string[];
  /** Onboarding subjects, used to personalize the "Add a course" picker. */
  suggestedSubjects?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages && initialMessages.length
      ? initialMessages
      : greeting
        ? [{ id: "greeting", role: "assistant", content: greeting }]
        : []
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [menuOpen, setMenuOpen] = useState(false); // mobile sidebar drawer
  const [activeId, setActiveId] = useState<string | null>(null); // bubble being typed
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Smooth typewriter reveal ------------------------------------------
  // Network chunks arrive in bursts; we buffer the full received text in
  // `targetRef` and reveal it character-by-character on an rAF loop so the
  // reply types out at a steady, pleasant cadence regardless of packet timing.
  const targetRef = useRef(""); // full text received so far
  const shownRef = useRef(0); // chars currently rendered
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false); // network stream closed
  const pinnedRef = useRef(true); // is the view scrolled to the bottom?

  const revealStep = useCallback((id: string) => {
    if (rafRef.current !== null) return; // a loop is already running
    const tick = () => {
      const target = targetRef.current;
      if (shownRef.current < target.length) {
        // Catch up faster the further behind we are, so we never lag badly.
        const remaining = target.length - shownRef.current;
        shownRef.current += Math.max(1, Math.ceil(remaining / 6));
        const slice = target.slice(0, shownRef.current);
        setMessages((m) =>
          m.map((msg) => (msg.id === id ? { ...msg, content: slice } : msg))
        );
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        if (doneRef.current) setActiveId(null); // caught up + closed → drop caret
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Keep the latest message in view — instant (not smooth) so rapid token
  // updates don't stack animations, and only while the user is at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Stop any in-flight reveal if the component unmounts (e.g. course switch).
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

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

      // Reset the reveal buffer for this turn.
      targetRef.current = "";
      shownRef.current = 0;
      doneRef.current = false;
      const assistantId = `a-${Date.now()}`;
      setActiveId(assistantId);
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
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          targetRef.current += decoder.decode(value, { stream: true });
          revealStep(assistantId); // feed the typewriter
        }
        doneRef.current = true;
        revealStep(assistantId); // ensure the tail is flushed + caret cleared
      } catch {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        doneRef.current = true;
        setActiveId(null);
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
    [messages, streaming, subject, topic, sessionId, revealStep]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-[100dvh]">
      <ChatSidebar
        subjects={subjects}
        activeSubject={subject}
        suggestedSubjects={suggestedSubjects}
        mobileOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Chat column — fills the remaining width */}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Progress / topic header */}
      <header className="border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="-ml-1 shrink-0 rounded-lg p-1.5 text-fg hover:bg-surface-alt md:hidden"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{topic || subject}</p>
              <p className="truncate text-xs text-muted">{subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <MasteryBar mastery={initialMastery} size="sm" />
            </div>
            <SessionTimer />
          </div>
        </div>
      </header>

      {/* Transcript */}
      <main
        id="main"
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinnedRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="flex-1 overflow-y-auto px-4 py-6"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="mt-12 text-center text-muted">
              <p className="text-lg font-medium text-fg">Ready when you are.</p>
              <p className="mt-1 text-sm">Ask a question, or just say hi to get started.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} streaming={m.id === activeId} />
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <StreamingIndicator />
          )}
        </div>
      </main>

      {/* Composer + quick replies */}
      <footer className="border-t border-border bg-surface px-4 py-3">
        <div className="mx-auto max-w-3xl">
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
        </div>
      </footer>
      </div>

      <AccessibilityToolbar />
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

/**
 * SessionTimer — isolated so its 1-second tick re-renders only this tiny
 * component, not the whole transcript (a major source of the old lag).
 */
function SessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    const t = setInterval(() => {
      if (startRef.current) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span
      className="tabular-nums text-xs text-muted"
      aria-label={`Time in session: ${mm} minutes ${ss} seconds`}
      title="Time in this session (no rush!)"
    >
      ⏱ {mm}:{ss}
    </span>
  );
}
