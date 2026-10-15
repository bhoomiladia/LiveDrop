import { redirect } from "next/navigation";
import { initialProfile } from "@/lib/profile-values";
import { getCurrentUser } from "@/lib/auth";
import OnboardingFlow from "./onboarding-flow";

export const metadata = { title: "Set up your account · Live Drop" };
export const dynamic = "force-dynamic";

// Only same-site paths are allowed as the place to land afterwards.
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding") ? next : "/dashboard";
}

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const user = await getCurrentUser();
  const next = safeNext((await props.searchParams).next);
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
  if (user.role && user.onboarded_at) redirect(next);
  return <OnboardingFlow role={user.role} email={user.email} initial={initialProfile(user)} next={next} />;
}
