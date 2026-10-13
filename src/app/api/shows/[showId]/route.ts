import { NextResponse, type NextRequest } from "next/server";
import { paidTotals, showSnapshot } from "@/lib/live";
import { getViewer, requireSeller } from "@/lib/viewer";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]">) {
  const { showId } = await ctx.params;
  const viewer = await getViewer();
  const snapshot = showSnapshot(showId, viewer?.id);
  if (!snapshot) return NextResponse.json({ error: "Show not found." }, { status: 404 });
  const totals = (await requireSeller(showId)) ? paidTotals(showId) : null;
  return NextResponse.json({ ...snapshot, viewer, totals });
}
