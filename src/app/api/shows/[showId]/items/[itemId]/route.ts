import { NextResponse, type NextRequest } from "next/server";
import { goLive, updateDraft } from "@/lib/live";
import { col } from "@/lib/db";
import { requireSeller } from "@/lib/viewer";

async function sellerItem(showId: string, itemId: string) {
  const seller = await requireSeller(showId);
  if (!seller) return null;
  const row = await (await col("items")).findOne({ id: itemId, show_id: showId }, { projection: { id: 1 } });
  return row ? seller : null;
}

// Fix the title, size or price.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/items/[itemId]">) {
  const { showId, itemId } = await ctx.params;
  if (!(await sellerItem(showId, itemId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const edits: { title?: string; size?: string | null; price_cents?: number } = {};
  if (typeof body.title === "string") edits.title = body.title.slice(0, 80);
  if (typeof body.size === "string" || body.size === null) edits.size = body.size ? String(body.size).slice(0, 12) : null;
  if (body.priceUsd !== undefined) {
    const price = Number(body.priceUsd);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000) {
      return NextResponse.json({ error: "Price must be between 0 and 10,000 USD." }, { status: 400 });
    }
    edits.price_cents = Math.round(price * 100);
  }
  const item = await updateDraft(itemId, edits);
  return NextResponse.json({ ok: Boolean(item) });
}

// Put the item live so viewers can claim it.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/items/[itemId]">) {
  const { showId, itemId } = await ctx.params;
  const seller = await sellerItem(showId, itemId);
  if (!seller) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (seller.show.status !== "live") return NextResponse.json({ error: "Go live first." }, { status: 400 });
  const item = await goLive(itemId);
  if (!item) return NextResponse.json({ error: "Set a price before going live." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
