import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, getCurrentUser, setSessionCookie } from "@/lib/auth";
import { createJudgeBuyer, ensureDemo } from "@/lib/demo";

// Judge mode: one click signs you in as a fresh demo buyer and opens the demo show.
// A judge who is already signed in as a demo buyer keeps that account (and their bag).
export async function GET(req: NextRequest) {
  const demo = await ensureDemo();
  if (!demo) return NextResponse.json({ error: "Judge mode is off." }, { status: 404 });
  const current = await getCurrentUser();
  if (!current?.id.startsWith("judge-buyer-")) {
    const buyer = await createJudgeBuyer();
    await setSessionCookie(await createSessionToken({ userId: buyer.id, email: buyer.email, name: buyer.name }));
  }
  return NextResponse.redirect(new URL(`/live/${demo.showId}`, req.url));
}
