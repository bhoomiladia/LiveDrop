import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { claimItem, getShow } from "@/lib/live";
import { getViewer } from "@/lib/viewer";

// Claim a specific item with a button (e.g. an earlier item that opened up again).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/claim">) {
  const { showId } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Pick a name first." }, { status: 401 });
  if (getShow(showId)?.status !== "live") return NextResponse.json({ error: "The show isn't live." }, { status: 400 });

  const { itemId } = await req.json().catch(() => ({}));
  const item = typeof itemId === "string"
    ? (getDb().prepare("SELECT id, status, listed_at FROM items WHERE id = ? AND show_id = ?").get(itemId, showId) as
        | { id: string; status: string; listed_at: number | null }
        | undefined)
    : undefined;
  if (!item?.listed_at) return NextResponse.json({ error: "That item isn't up for grabs." }, { status: 404 });
  if (item.status !== "listed" && item.status !== "claimed") {
    return NextResponse.json({ error: "That item is already sold." }, { status: 409 });
  }

  const claim = claimItem(item.id, viewer, null, "human");
  return NextResponse.json({ ok: true, status: claim?.status });
}
