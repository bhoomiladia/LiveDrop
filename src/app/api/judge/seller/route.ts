import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { DEMO_SELLER, ensureDemo } from "@/lib/demo";

// Judge mode: one click signs you in as the demo seller (Rosa) and opens her studio.
// Rosa has no password and only owns the demo shop, so nobody else's data is reachable.
export async function GET(req: NextRequest) {
  const demo = await ensureDemo();
  if (!demo) return NextResponse.json({ error: "Judge mode is off." }, { status: 404 });
  await setSessionCookie(await createSessionToken({ userId: DEMO_SELLER.id, email: DEMO_SELLER.email, name: DEMO_SELLER.name }));
  return NextResponse.redirect(new URL(`/studio/${demo.showId}`, req.url));
}
