import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile, getProgress } from "@/lib/db/queries";
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

  return (
    <ChatInterface
      subject={subject}
      topic={topic}
      initialMastery={mastery}
      greeting={greeting}
    />
  );
}
