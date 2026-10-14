import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createShow, listPublicShows } from "@/lib/live";

// Public: shows that are live, starting soon, or just ended (for the home page).
export async function GET() {
  return NextResponse.json(listPublicShows(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to create a show." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  if (title.length < 3) return NextResponse.json({ error: "Give your show a title (at least 3 characters)." }, { status: 400 });

  const shippingUsd = Number(body.shippingUsd ?? 7);
  if (!Number.isFinite(shippingUsd) || shippingUsd < 0 || shippingUsd > 100) {
    return NextResponse.json({ error: "Shipping must be between 0 and 100 USD." }, { status: 400 });
  }

  const claimMinutes = Number(body.claimMinutes ?? 5);
  if (!Number.isInteger(claimMinutes) || claimMinutes < 1 || claimMinutes > 30) {
    return NextResponse.json({ error: "Time to pay must be 1 to 30 minutes." }, { status: 400 });
  }

  const show = createShow(user.id, title, Math.round(shippingUsd * 100), claimMinutes);
  return NextResponse.json({ show });
}
