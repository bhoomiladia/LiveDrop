import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanProfile, saveProfile } from "@/lib/profile";

// Saves the signed-in user's profile. During onboarding it also sets the role (once) and finishes setup.
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const role = user.role ?? (body.role === "seller" || body.role === "buyer" ? body.role : null);
  if (!role) return NextResponse.json({ error: "Choose whether you want to sell or shop." }, { status: 400 });

  const profile = cleanProfile(role, body);
  if (typeof profile === "string") return NextResponse.json({ error: profile }, { status: 400 });

  const saved = saveProfile(user.id, profile, { role, finishOnboarding: body.finish === true });
  return NextResponse.json({ ok: true, role: saved.role, onboarded: Boolean(saved.onboarded_at) });
}
