import { NextResponse, type NextRequest } from "next/server";
import { setShowStatus } from "@/lib/live";
import { requireSeller } from "@/lib/viewer";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/status">) {
  const { showId } = await ctx.params;
  const seller = await requireSeller(showId);
  if (!seller) return NextResponse.json({ error: "Only this show's seller can do that." }, { status: 403 });

  const { status } = await req.json().catch(() => ({}));
  if (status !== "live" && status !== "ended") return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  await setShowStatus(showId, status);
  return NextResponse.json({ ok: true, status });
}
