import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paidTotals, showSnapshot } from "@/lib/live";
import { getViewer, requireSeller } from "@/lib/viewer";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]">) {
  const { showId } = await ctx.params;
  const [viewer, user] = await Promise.all([getViewer(), getCurrentUser()]);
  const snapshot = showSnapshot(showId, viewer?.id);
  if (!snapshot) return NextResponse.json({ error: "Show not found." }, { status: 404 });
  const totals = (await requireSeller(showId)) ? paidTotals(showId) : null;
  // Who is watching: the live room uses this to ask signed-out visitors and sellers to use a buyer account.
  const account = user ? { name: user.name, role: user.role } : null;
  return NextResponse.json({ ...snapshot, viewer, totals, account });
}
