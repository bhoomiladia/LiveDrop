import "server-only";
import { col } from "./db";

// Flat tables of a seller's Live Drop activity for the AG Studio control room.
// Dollar amounts are plain numbers (USD); dates are ISO strings.

const usd = (cents: number | null | undefined) => (cents === null || cents === undefined ? null : Math.round(cents) / 100);
const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);

export type ControlData = Awaited<ReturnType<typeof getControlData>>;

export async function getControlData(sellerId: string) {
  const shows = await (await col("shows"))
    .find({ seller_id: sellerId }, { projection: { _id: 0, id: 1, title: 1, status: 1, created_at: 1, started_at: 1, ended_at: 1 } })
    .sort({ created_at: 1 })
    .toArray();
  const showTitle = new Map(shows.map((s) => [s.id, s.title]));
  const ids = shows.map((s) => s.id);
  if (!ids.length) return { shows: [], items: [], orders: [], claims: [], chat: [], asOf: new Date().toISOString() };
  const inShows = { $in: ids };

  const [itemRows, orderRows, claimRows, chatRows, bidCounts] = await Promise.all([
    (await col("items")).find({ show_id: inShows, listed_at: { $ne: null } }, { projection: { image_data: 0, transcript: 0 } }).sort({ listed_at: 1 }).toArray(),
    (await col("orders")).find({ show_id: inShows, status: { $in: ["paid", "on_hold", "partially_refunded", "refunded"] } }).sort({ created_at: 1 }).toArray(),
    (await col("claims")).find({ show_id: inShows }).sort({ created_at: 1 }).toArray(),
    (await col("messages")).find({ show_id: inShows }, { projection: { id: 1, show_id: 1, kind: 1, needs_seller: 1, created_at: 1 } }).toArray(),
    (await col("bids")).aggregate<{ _id: string; n: number }>([{ $match: { show_id: inShows } }, { $group: { _id: "$item_id", n: { $sum: 1 } } }]).toArray(),
  ]);

  // What the SQL subqueries used to add to each item: first claim, buyer, bids, claims, how it sold.
  const claimById = new Map(claimRows.map((c) => [c.id, c]));
  const claimsByItem = new Map<string, typeof claimRows>();
  for (const c of claimRows) claimsByItem.set(c.item_id, [...(claimsByItem.get(c.item_id) ?? []), c]);
  const bids = new Map(bidCounts.map((b) => [b._id, b.n]));
  const links = orderRows.length ? await (await col("order_items")).find({ order_id: { $in: orderRows.map((o) => o.id) } }).toArray() : [];
  const orderKind = new Map(orderRows.map((o) => [o.id, o.kind]));
  const kindByItem = new Map<string, string>();
  for (const l of links) if (!kindByItem.has(l.item_id)) kindByItem.set(l.item_id, orderKind.get(l.order_id)!);

  const items = itemRows.map((row) => {
    const winner = row.winner_claim_id ? claimById.get(row.winner_claim_id) : undefined;
    const wonAts = (claimsByItem.get(row.id) ?? []).flatMap((c) => (c.won_at ? [c.won_at] : []));
    return {
      ...row,
      first_claim: wonAts.length ? Math.min(...wonAts) : null,
      buyer: winner?.viewer_name ?? null,
      buyer_source: winner?.source ?? null,
      bids: bids.get(row.id) ?? 0,
      claim_count: claimsByItem.get(row.id)?.length ?? 0,
      order_kind: kindByItem.get(row.id) ?? null,
    } as Record<string, unknown>;
  }).map((i) => {
    const sold = ["paid", "shipped", "on_hold"].includes(String(i.status));
    const saleType = !sold
      ? "Unsold"
      : i.auction_ends_at
        ? "Flash auction"
        : i.order_kind === "agent"
          ? "AI agent"
          : i.order_kind === "invoice"
            ? "Invoice (after show)"
            : "Live checkout";
    return {
      id: String(i.id),
      showId: String(i.show_id),
      show: showTitle.get(String(i.show_id)) ?? "",
      seq: Number(i.seq),
      title: String(i.title),
      category: (i.category as string | null) ?? "Uncategorized",
      size: (i.size as string | null) ?? "—",
      condition: (i.condition as string | null) ?? "—",
      price: usd(Number(i.price_cents)),
      storePrice: usd(i.retail_cents as number | null),
      status: String(i.status),
      sold: sold ? 1 : 0,
      saleType,
      buyer: (i.buyer as string | null) ?? "—",
      bids: Number(i.bids),
      claims: Number(i.claim_count),
      listedAt: iso(i.listed_at as number),
      minutesToClaim: i.first_claim ? Math.round(((Number(i.first_claim) - Number(i.listed_at)) / 60_000) * 10) / 10 : null,
    };
  });

  const orders = (orderRows as Record<string, unknown>[]).map((o) => {
    const items = Number(o.item_cents);
    const shipping = Number(o.shipping_cents);
    const refunded = Number(o.refunded_cents ?? 0);
    return {
      id: String(o.id),
      showId: String(o.show_id),
      show: showTitle.get(String(o.show_id)) ?? "",
      buyer: String(o.viewer_name),
      channel: o.kind === "agent" ? "AI agent" : o.kind === "invoice" ? "PayPal invoice" : "PayPal checkout",
      status: o.status === "on_hold" ? "on hold (undo window)" : String(o.status).replace("_", " "),
      itemsTotal: usd(items),
      shipping: usd(shipping),
      refunded: usd(refunded),
      collected: o.status === "on_hold" ? 0 : usd(items + shipping - refunded),
      shipped: o.tracking_number ? "yes" : "no",
      createdAt: iso(o.created_at as number),
    };
  });

  const claims = (claimRows as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    itemId: String(c.item_id),
    showId: String(c.show_id),
    buyer: String(c.viewer_name),
    who: c.source === "agent" ? "AI agent" : "Person",
    outcome: String(c.status),
    createdAt: iso(c.created_at as number),
  }));

  const KIND: Record<string, string> = {
    claim: "Claim",
    bid: "Bid",
    question: "Question",
    answer: "Assistant answer",
    seller: "Seller reply",
    other: "Chat",
    pending: "Chat",
  };
  const chat = (chatRows as Record<string, unknown>[]).map((m) => ({
    id: String(m.id),
    showId: String(m.show_id),
    show: showTitle.get(String(m.show_id)) ?? "",
    kind: KIND[String(m.kind)] ?? "Chat",
    flaggedForSeller: Number(m.needs_seller) ? "yes" : "no",
    createdAt: iso(m.created_at as number),
  }));

  return {
    shows: shows.map((s) => ({ id: s.id, title: s.title, status: s.status, startedAt: iso(s.started_at ?? s.created_at), endedAt: iso(s.ended_at) })),
    items,
    orders,
    claims,
    chat,
    asOf: new Date().toISOString(),
  };
}
