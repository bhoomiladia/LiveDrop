import { NextResponse, type NextRequest } from "next/server";
import { col } from "@/lib/db";
import { startAuction } from "@/lib/live";
import { requireSeller } from "@/lib/viewer";

// Seller starts a flash auction on an open item.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/items/[itemId]/auction">) {
  const { showId, itemId } = await ctx.params;
  const seller = await requireSeller(showId);
  if (!seller) return NextResponse.json({ error: "Only this show's seller can do that." }, { status: 403 });
  if (seller.show.status !== "live") return NextResponse.json({ error: "Go live first." }, { status: 400 });
  if (!(await (await col("items")).findOne({ id: itemId, show_id: showId }, { projection: { id: 1 } }))) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const startUsd = Number(body.startUsd);
  const seconds = Number(body.seconds ?? 30);
  if (!Number.isFinite(startUsd) || startUsd < 1 || startUsd > 10_000) return NextResponse.json({ error: "Starting bid: 1 to 10,000 USD." }, { status: 400 });
  if (![15, 30, 60].includes(seconds)) return NextResponse.json({ error: "Auction length: 15, 30 or 60 seconds." }, { status: 400 });

  const result = await startAuction(itemId, Math.round(startUsd * 100), seconds);
  if (typeof result === "string") return NextResponse.json({ error: result }, { status: 409 });
  return NextResponse.json({ ok: true, ends_at: result.auction_ends_at });
}
