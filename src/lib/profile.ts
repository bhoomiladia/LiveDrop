import "server-only";
import { getDb, type UserRecord } from "./db";
import { getBag, listShowsForSeller, type ShowRow } from "./live";

// ----------------------------------------------------------------- profile and onboarding

export type ProfileInput = {
  name?: string;
  bio?: string | null;
  shop_name?: string | null;
  default_shipping_cents?: number | null;
  default_claim_minutes?: number | null;
  sizes?: string | null;
  interests?: string | null;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || null : null);

// Validates a profile form for this user's role. Returns the clean fields, or an error message.
export function cleanProfile(role: "seller" | "buyer", body: Record<string, unknown>): ProfileInput | string {
  const name = text(body.name, 60);
  if (!name || name.length < 2) return "Enter your name (at least 2 characters).";
  const out: ProfileInput = { name, bio: text(body.bio, 280) };
  if (role === "seller") {
    out.shop_name = text(body.shop_name, 60);
    if (!out.shop_name) return "Give your shop a name.";
    const shipping = Number(body.shipping_usd);
    if (!Number.isFinite(shipping) || shipping < 0 || shipping > 100) return "Shipping must be between 0 and 100 USD.";
    out.default_shipping_cents = Math.round(shipping * 100);
    const minutes = Number(body.claim_minutes);
    if (![1, 2, 3, 5, 10, 15, 30].includes(minutes)) return "Pick how long buyers have to pay.";
    out.default_claim_minutes = minutes;
  } else {
    out.sizes = text(body.sizes, 60);
    out.interests = text(body.interests, 200);
  }
  return out;
}

export function saveProfile(userId: string, p: ProfileInput, opts: { role?: "seller" | "buyer"; finishOnboarding?: boolean } = {}) {
  const db = getDb();
  const now = Date.now();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    sets.push(`${k} = ?`);
    args.push(v);
  }
  // The role can only be set once (accounts that signed up with Google choose it in onboarding).
  if (opts.role) sets.push(`role = COALESCE(role, '${opts.role === "seller" ? "seller" : "buyer"}')`);
  if (opts.finishOnboarding) {
    sets.push("onboarded_at = COALESCE(onboarded_at, ?)");
    args.push(now);
  }
  sets.push("updated_at = ?");
  args.push(now, userId);
  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRecord;
}

export function homeFor(user: Pick<UserRecord, "role" | "onboarded_at">): string {
  return !user.role || !user.onboarded_at ? "/onboarding" : "/dashboard";
}

// ----------------------------------------------------------------- seller overview

export type SellerOverview = ReturnType<typeof getSellerOverview>;

export function getSellerOverview(sellerId: string) {
  const db = getDb();
  const shows = listShowsForSeller(sellerId);
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(o.item_cents + o.shipping_cents - o.refunded_cents), 0) AS collected_cents, COUNT(*) AS orders
       FROM orders o JOIN shows s ON s.id = o.show_id
       WHERE s.seller_id = ? AND o.status IN ('paid', 'partially_refunded', 'refunded')`,
    )
    .get(sellerId) as { collected_cents: number; orders: number };
  const sold = db
    .prepare(
      `SELECT COUNT(*) AS n FROM items i JOIN shows s ON s.id = i.show_id
       WHERE s.seller_id = ? AND i.status IN ('paid', 'shipped', 'on_hold')`,
    )
    .get(sellerId) as { n: number };
  const unpaid = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(COALESCE(c.bid_cents, i.price_cents)), 0) AS cents
       FROM claims c JOIN items i ON i.id = c.item_id JOIN shows s ON s.id = c.show_id
       WHERE s.seller_id = ? AND c.status = 'won' AND i.status = 'claimed'`,
    )
    .get(sellerId) as { n: number; cents: number };
  const openInvoices = db
    .prepare(`SELECT COUNT(*) AS n FROM invoices v JOIN shows s ON s.id = v.show_id WHERE s.seller_id = ? AND v.status = 'sent'`)
    .get(sellerId) as { n: number };
  const toShip = db
    .prepare(
      `SELECT COUNT(*) AS n FROM orders o JOIN shows s ON s.id = o.show_id
       WHERE s.seller_id = ? AND o.status = 'paid' AND o.tracking_number IS NULL`,
    )
    .get(sellerId) as { n: number };
  const recentOrders = db
    .prepare(
      `SELECT o.id, o.show_id, s.title AS show_title, o.viewer_name, o.kind, o.status, o.item_cents + o.shipping_cents AS total_cents,
         o.tracking_number, o.created_at,
         (SELECT GROUP_CONCAT(i.title, ', ') FROM order_items oi JOIN items i ON i.id = oi.item_id WHERE oi.order_id = o.id) AS items
       FROM orders o JOIN shows s ON s.id = o.show_id
       WHERE s.seller_id = ? AND o.status NOT IN ('created', 'failed')
       ORDER BY o.created_at DESC LIMIT 6`,
    )
    .all(sellerId) as {
    id: string;
    show_id: string;
    show_title: string;
    viewer_name: string;
    kind: string;
    status: string;
    total_cents: number;
    tracking_number: string | null;
    created_at: number;
    items: string | null;
  }[];
  // Questions the shop assistant couldn't answer and the seller hasn't replied to yet.
  const questions = db
    .prepare(
      `SELECT m.id, m.show_id, s.title AS show_title, m.viewer_name, m.text, m.created_at
       FROM messages m JOIN shows s ON s.id = m.show_id
       WHERE s.seller_id = ? AND m.needs_seller = 1
         AND NOT EXISTS (SELECT 1 FROM messages r WHERE r.reply_to = m.id AND r.kind = 'seller')
       ORDER BY m.created_at DESC LIMIT 5`,
    )
    .all(sellerId) as { id: string; show_id: string; show_title: string; viewer_name: string; text: string; created_at: number }[];

  return {
    shows,
    liveShow: shows.find((s) => s.status === "live") ?? null,
    nextShow: shows.find((s) => s.status === "scheduled") ?? null,
    collected_cents: totals.collected_cents,
    orders: totals.orders,
    sold: sold.n,
    unpaid_items: unpaid.n,
    unpaid_cents: unpaid.cents,
    open_invoices: openInvoices.n,
    to_ship: toShip.n,
    recentOrders,
    questions,
  };
}

// Per-show numbers for the seller's show list.
export function getShowStats(showIds: string[]) {
  if (!showIds.length) return new Map<string, { listed: number; sold: number; collected_cents: number }>();
  const db = getDb();
  const marks = showIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT s.id,
         (SELECT COUNT(*) FROM items i WHERE i.show_id = s.id AND i.listed_at IS NOT NULL) AS listed,
         (SELECT COUNT(*) FROM items i WHERE i.show_id = s.id AND i.status IN ('paid', 'shipped', 'on_hold')) AS sold,
         (SELECT COALESCE(SUM(o.item_cents + o.shipping_cents - o.refunded_cents), 0) FROM orders o
            WHERE o.show_id = s.id AND o.status IN ('paid', 'partially_refunded', 'refunded')) AS collected_cents
       FROM shows s WHERE s.id IN (${marks})`,
    )
    .all(...showIds) as { id: string; listed: number; sold: number; collected_cents: number }[];
  return new Map(rows.map((r) => [r.id, r]));
}

// ----------------------------------------------------------------- buyer activity

export type BuyerShowBag = {
  show: Pick<ShowRow, "id" | "title" | "status" | "shipping_cents"> & { seller_name: string };
  bag: ReturnType<typeof getBag>;
};

export type BuyerOrder = {
  id: string;
  show_id: string;
  show_title: string;
  seller_name: string;
  kind: string;
  status: string;
  item_cents: number;
  shipping_cents: number;
  refunded_cents: number;
  carrier: string | null;
  tracking_number: string | null;
  created_at: number;
  items: string | null;
};

// Every show this buyer has claimed in, with their bag there (unpaid items, holds, invoices, waiting lines).
export function getBuyerBags(buyerId: string): BuyerShowBag[] {
  const db = getDb();
  const shows = db
    .prepare(
      `SELECT s.id, s.title, s.status, s.shipping_cents, u.name AS seller_name, MAX(c.created_at) AS last_at
       FROM claims c JOIN shows s ON s.id = c.show_id JOIN users u ON u.id = s.seller_id
       WHERE c.viewer_id = ? GROUP BY s.id ORDER BY last_at DESC LIMIT 20`,
    )
    .all(buyerId) as (BuyerShowBag["show"] & { last_at: number })[];
  return shows.map((s) => ({ show: { id: s.id, title: s.title, status: s.status, shipping_cents: s.shipping_cents, seller_name: s.seller_name }, bag: getBag(s.id, buyerId) }));
}

export function getBuyerOrders(buyerId: string): BuyerOrder[] {
  return getDb()
    .prepare(
      `SELECT o.id, o.show_id, s.title AS show_title, u.name AS seller_name, o.kind, o.status, o.item_cents, o.shipping_cents,
         o.refunded_cents, o.carrier, o.tracking_number, o.created_at,
         (SELECT GROUP_CONCAT(i.title, ', ') FROM order_items oi JOIN items i ON i.id = oi.item_id WHERE oi.order_id = o.id) AS items
       FROM orders o JOIN shows s ON s.id = o.show_id JOIN users u ON u.id = s.seller_id
       WHERE o.viewer_id = ? AND o.status NOT IN ('created', 'failed')
       ORDER BY o.created_at DESC LIMIT 50`,
    )
    .all(buyerId) as BuyerOrder[];
}
