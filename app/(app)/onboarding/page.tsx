import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/lib/db/queries";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // If they've already onboarded, send them home.
  const profile = await getProfile(userId);
  if (profile?.onboardingComplete) redirect("/dashboard");

  return <OnboardingChat />;
}
