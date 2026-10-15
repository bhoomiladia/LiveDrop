import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { UserRecord } from "./db";

export type Account = UserRecord & { role: "seller" | "buyer" };

// For pages behind sign-in: sends signed-out visitors to login and unfinished accounts to onboarding.
export async function requireAccount(callbackUrl: string, role?: "seller" | "buyer"): Promise<Account> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!user.role || !user.onboarded_at) redirect(`/onboarding?next=${encodeURIComponent(callbackUrl)}`);
  if (role && user.role !== role) redirect("/dashboard");
  return user as Account;
}
