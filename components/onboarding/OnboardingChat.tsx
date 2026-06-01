"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { StreamingIndicator } from "@/components/chat/StreamingIndicator";
import { StepIndicator } from "./StepIndicator";
import { AccessibilityToolbar } from "@/components/ui/AccessibilityToolbar";
import type { ChatMessage } from "@/types/session";

/**
 * OnboardingChat — the conversational intake. Uses the same bubble UI as the
 * learning chat but wrapped in a warmer theme and a Step N of 7 indicator.
 *
 * Onboarding is request/response JSON (not streamed): each turn returns the
 * reply, the new step, and whether onboarding is complete. When complete, we
 * route to the dashboard.
 *
 * A "Skip" button is present on every step (spec requirement). Skipping sends a
 * polite "I'd rather skip this one" so the agent moves on gracefully.
 */
export function OnboardingChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);

  // Kick off the conversation: ask the agent for its opening welcome.
  useEffect(() => {
    if (kickedOff.current) return;
    kickedOff.current = true;
    void turn([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function turn(history: ChatMessage[]) {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as {
        reply: string;
        step: number;
        complete: boolean;
        summary: string | null;
      };
      setStep(data.step);
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply },
      ]);
      if (data.complete) {
        setDone(true);
        // Brief pause so the learner can read the hand-off, then go to dashboard.
        setTimeout(() => router.push("/dashboard"), 1800);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Hmm, I had a hiccup. Could you say that once more?",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function sendUser(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || done) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    void turn(history);
  }

  return (
    <div className="theme-onboarding min-h-[100dvh] bg-bg">
      <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
        <header className="px-4 py-4">
          <StepIndicator step={step} />
        </header>

        <main
          id="main"
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-2"
          aria-live="polite"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {busy && <StreamingIndicator />}
        </main>

        <footer className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendUser(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="onboarding-input" className="sr-only">
              Your answer
            </label>
            <textarea
              id="onboarding-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendUser(input);
                }
              }}
              rows={1}
              disabled={busy || done}
              placeholder="Type your answer…"
              className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-fg placeholder:text-muted focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || done || !input.trim()}
              className="h-[44px] shrink-0 rounded-xl bg-primary px-4 font-medium text-primary-fg disabled:opacity-50"
            >
              Send
            </button>
          </form>
          <button
            type="button"
            onClick={() => sendUser("I'd rather skip this one.")}
            disabled={busy || done}
            className="mt-2 text-sm text-muted underline underline-offset-2 hover:text-fg disabled:opacity-50"
          >
            Skip this question
          </button>
        </footer>
      </div>
      <AccessibilityToolbar />
    </div>
  );
}
