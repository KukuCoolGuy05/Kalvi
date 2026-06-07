import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile, getProgress, getLatestSession } from "@/lib/db/queries";
import { ChatInterface } from "@/components/chat/ChatInterface";

/**
 * Learning session screen. Subject/topic come from query params (set by the
 * dashboard cards / review queue). Falls back to the learner's first chosen
 * subject if none provided.
 */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: { subject?: string; topic?: string };
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  const subject = searchParams.subject || profile.subjects[0] || "General";
  const topic = searchParams.topic || subject;

  // Look up current mastery for the progress bar.
  const progress = await getProgress(userId, subject);
  const record = progress.find((p) => p.topic === topic);
  const mastery = record?.masteryLevel ?? 0;

  const greeting = record
    ? `Welcome back! Last time we worked on ${topic}. Want a quick refresher, or shall we pick up where we left off?`
    : `Hi! Ready to dig into ${topic}? Tell me what you already know, or ask me anything to start.`;

  // Resume the previous conversation for this course, if there is one, so the
  // transcript persists when the learner leaves and comes back.
  const previous = await getLatestSession(userId, subject, topic);
  const initialMessages = previous?.messages?.length ? previous.messages : undefined;

  // Subjects the learner is enrolled in — power the sidebar course list. We
  // union the active subject in so a freshly-started course always appears.
  const subjects = Array.from(new Set([...profile.subjects, subject])).filter(Boolean);

  return (
    // `key` remounts the chat when the learner switches to a different course
    // or resumed session, so state resets cleanly instead of sticking to the
    // previous one. (Same session → resumes from initialMessages below.)
    <ChatInterface
      key={`${subject}::${previous?.id ?? topic}`}
      subject={subject}
      topic={topic}
      initialMastery={mastery}
      greeting={greeting}
      initialMessages={initialMessages}
      initialSessionId={previous?.id ?? null}
      subjects={subjects}
      suggestedSubjects={profile.subjects}
    />
  );
}
