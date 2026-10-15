import { NextResponse, type NextRequest } from "next/server";
import { col } from "@/lib/db";
import { claimItem, getShow } from "@/lib/live";
import { getViewer } from "@/lib/viewer";

// Claim a specific item with a button (e.g. an earlier item that opened up again).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/claim">) {
  const { showId } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in with a buyer account first." }, { status: 401 });
  if ((await getShow(showId))?.status !== "live") return NextResponse.json({ error: "The show isn't live." }, { status: 400 });

  const { itemId } = await req.json().catch(() => ({}));
  const item = typeof itemId === "string"
    ? await (await col("items")).findOne({ id: itemId, show_id: showId }, { projection: { id: 1, status: 1, listed_at: 1 } })
    : null;
  if (!item?.listed_at) return NextResponse.json({ error: "That item isn't up for grabs." }, { status: 404 });
  if (item.status !== "listed" && item.status !== "claimed") {
    return NextResponse.json({ error: "That item is already sold." }, { status: 409 });
  }

  const claim = await claimItem(item.id, viewer, null, "human");
  if (!claim) return NextResponse.json({ error: "An auction is running: type your bid in the chat." }, { status: 409 });
  return NextResponse.json({ ok: true, status: claim.status });
}
