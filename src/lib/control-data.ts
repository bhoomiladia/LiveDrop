import "server-only";
import { getDb } from "./db";

// Flat tables of a seller's Live Drop activity for the AG Studio control room.
// Dollar amounts are plain numbers (USD); dates are ISO strings.

const usd = (cents: number | null | undefined) => (cents === null || cents === undefined ? null : Math.round(cents) / 100);
const iso = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString() : null);

export type ControlData = ReturnType<typeof getControlData>;

export function getControlData(sellerId: string) {
  const db = getDb();
  const shows = db
    .prepare("SELECT id, title, status, created_at, started_at, ended_at FROM shows WHERE seller_id = ? ORDER BY created_at")
    .all(sellerId) as { id: string; title: string; status: string; created_at: number; started_at: number | null; ended_at: number | null }[];
  const showTitle = new Map(shows.map((s) => [s.id, s.title]));
  const ids = shows.map((s) => s.id);
  if (!ids.length) return { shows: [], items: [], orders: [], claims: [], chat: [], asOf: new Date().toISOString() };
  const inShows = `(${ids.map(() => "?").join(",")})`;

  const items = (
    db
      .prepare(
        `SELECT i.*,
           (SELECT MIN(c.won_at) FROM claims c WHERE c.item_id = i.id AND c.won_at IS NOT NULL) AS first_claim,
           (SELECT c.viewer_name FROM claims c WHERE c.id = i.winner_claim_id) AS buyer,
           (SELECT c.source FROM claims c WHERE c.id = i.winner_claim_id) AS buyer_source,
           (SELECT COUNT(*) FROM bids b WHERE b.item_id = i.id) AS bids,
           (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) AS claim_count,
           (SELECT o.kind FROM orders o JOIN order_items oi ON oi.order_id = o.id
              WHERE oi.item_id = i.id AND o.status IN ('paid', 'on_hold', 'partially_refunded', 'refunded') LIMIT 1) AS order_kind
         FROM items i WHERE i.show_id IN ${inShows} AND i.listed_at IS NOT NULL ORDER BY i.listed_at`,
      )
      .all(...ids) as Record<string, unknown>[]
  ).map((i) => {
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

  const orders = (
    db
      .prepare(`SELECT * FROM orders WHERE show_id IN ${inShows} AND status IN ('paid', 'on_hold', 'partially_refunded', 'refunded') ORDER BY created_at`)
      .all(...ids) as Record<string, unknown>[]
  ).map((o) => {
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

  const claims = (
    db.prepare(`SELECT * FROM claims WHERE show_id IN ${inShows} ORDER BY created_at`).all(...ids) as Record<string, unknown>[]
  ).map((c) => ({
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
  const chat = (
    db.prepare(`SELECT id, show_id, kind, needs_seller, created_at FROM messages WHERE show_id IN ${inShows}`).all(...ids) as Record<string, unknown>[]
  ).map((m) => ({
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
