import "server-only";
import { col, type ItemRow, type UserRecord } from "./db";
import { COLLECTED_STATUSES, getBag, itemCountsByShow, listShowsForSeller, type Bag, type ShowRow } from "./live";

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

export async function saveProfile(userId: string, p: ProfileInput, opts: { role?: "seller" | "buyer"; finishOnboarding?: boolean } = {}) {
  const users = await col("users");
  const now = Date.now();
  const fields = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<UserRecord>;
  await users.updateOne({ id: userId }, { $set: { ...fields, updated_at: now } });
  // The role can only be set once (accounts that signed up with Google choose it in onboarding).
  if (opts.role) await users.updateOne({ id: userId, role: null }, { $set: { role: opts.role === "seller" ? "seller" : "buyer" } });
  if (opts.finishOnboarding) await users.updateOne({ id: userId, onboarded_at: null }, { $set: { onboarded_at: now } });
  return (await users.findOne({ id: userId }))!;
}

export function homeFor(user: Pick<UserRecord, "role" | "onboarded_at">): string {
  return !user.role || !user.onboarded_at ? "/onboarding" : "/dashboard";
}

// ----------------------------------------------------------------- seller overview

export type SellerOverview = Awaited<ReturnType<typeof getSellerOverview>>;

const SOLD_STATUSES: ItemRow["status"][] = ["paid", "shipped", "on_hold"];
const collectedCents = { $subtract: [{ $add: ["$item_cents", "$shipping_cents"] }, { $ifNull: ["$refunded_cents", 0] }] };

// "Denim Jacket, Wool Cardigan" for each order.
async function orderItemTitles(orderIds: string[]): Promise<Map<string, string>> {
  if (!orderIds.length) return new Map();
  const links = await (await col("order_items")).find({ order_id: { $in: orderIds } }).toArray();
  const items = links.length
    ? await (await col("items")).find({ id: { $in: links.map((l) => l.item_id) } }, { projection: { id: 1, title: 1 } }).toArray()
    : [];
  const title = new Map(items.map((i) => [i.id, i.title]));
  const out = new Map<string, string[]>();
  for (const l of links) {
    const t = title.get(l.item_id);
    if (t) out.set(l.order_id, [...(out.get(l.order_id) ?? []), t]);
  }
  return new Map([...out].map(([id, titles]) => [id, titles.join(", ")]));
}

export async function getSellerOverview(sellerId: string) {
  const shows = await listShowsForSeller(sellerId);
  const ids = shows.map((s) => s.id);
  const showTitle = new Map(shows.map((s) => [s.id, s.title]));
  const orders = await col("orders");
  const inShows = { $in: ids };

  const [totals, sold, wonClaims, openInvoices, toShip, recent, flagged] = await Promise.all([
    orders
      .aggregate<{ collected_cents: number; orders: number }>([
        { $match: { show_id: inShows, status: { $in: COLLECTED_STATUSES } } },
        { $group: { _id: null, collected_cents: { $sum: collectedCents }, orders: { $sum: 1 } } },
      ])
      .toArray()
      .then(([r]) => r ?? { collected_cents: 0, orders: 0 }),
    (await col("items")).countDocuments({ show_id: inShows, status: { $in: SOLD_STATUSES } }),
    (await col("claims")).find({ show_id: inShows, status: "won" }).toArray(),
    (await col("invoices")).countDocuments({ show_id: inShows, status: "sent" }),
    orders.countDocuments({ show_id: inShows, status: "paid", tracking_number: null }),
    orders.find({ show_id: inShows, status: { $nin: ["created", "failed"] } }).sort({ created_at: -1 }).limit(6).toArray(),
    (await col("messages")).find({ show_id: inShows, needs_seller: 1 }).sort({ created_at: -1 }).limit(50).toArray(),
  ]);

  const wonItems = wonClaims.length
    ? await (await col("items")).find({ id: { $in: wonClaims.map((c) => c.item_id) }, status: "claimed" }).toArray()
    : [];
  const claimedPrice = new Map(wonItems.map((i) => [i.id, i.price_cents]));
  const unpaid = wonClaims.filter((c) => claimedPrice.has(c.item_id));

  const titles = await orderItemTitles(recent.map((o) => o.id));
  const recentOrders = recent.map((o) => ({
    id: o.id,
    show_id: o.show_id,
    show_title: showTitle.get(o.show_id) ?? "",
    viewer_name: o.viewer_name,
    kind: o.kind,
    status: o.status,
    total_cents: o.item_cents + o.shipping_cents,
    tracking_number: o.tracking_number,
    created_at: o.created_at,
    items: titles.get(o.id) ?? null,
  }));

  // Questions the shop assistant couldn't answer and the seller hasn't replied to yet.
  const replied = flagged.length
    ? new Set(
        (await (await col("messages")).find({ reply_to: { $in: flagged.map((m) => m.id) }, kind: "seller" }, { projection: { reply_to: 1 } }).toArray()).map(
          (r) => r.reply_to,
        ),
      )
    : new Set();
  const questions = flagged
    .filter((m) => !replied.has(m.id))
    .slice(0, 5)
    .map((m) => ({ id: m.id, show_id: m.show_id, show_title: showTitle.get(m.show_id) ?? "", viewer_name: m.viewer_name, text: m.text, created_at: m.created_at }));

  return {
    shows,
    liveShow: shows.find((s) => s.status === "live") ?? null,
    nextShow: shows.find((s) => s.status === "scheduled") ?? null,
    collected_cents: totals.collected_cents,
    orders: totals.orders,
    sold,
    unpaid_items: unpaid.length,
    unpaid_cents: unpaid.reduce((sum, c) => sum + (c.bid_cents ?? claimedPrice.get(c.item_id)!), 0),
    open_invoices: openInvoices,
    to_ship: toShip,
    recentOrders,
    questions,
  };
}

// Per-show numbers for the seller's show list.
export async function getShowStats(showIds: string[]) {
  const stats = new Map<string, { listed: number; sold: number; collected_cents: number }>();
  if (!showIds.length) return stats;
  const [counts, collected] = await Promise.all([
    itemCountsByShow(showIds),
    (await col("orders"))
      .aggregate<{ _id: string; cents: number }>([
        { $match: { show_id: { $in: showIds }, status: { $in: COLLECTED_STATUSES } } },
        { $group: { _id: "$show_id", cents: { $sum: collectedCents } } },
      ])
      .toArray(),
  ]);
  const cents = new Map(collected.map((r) => [r._id, r.cents]));
  for (const id of showIds) stats.set(id, { listed: counts.get(id)?.listed ?? 0, sold: counts.get(id)?.sold ?? 0, collected_cents: cents.get(id) ?? 0 });
  return stats;
}

// ----------------------------------------------------------------- buyer activity

export type BuyerShowBag = {
  show: Pick<ShowRow, "id" | "title" | "status" | "shipping_cents"> & { seller_name: string };
  bag: Bag;
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

// Shows (with their sellers' names) by id, skipping any whose seller is gone.
async function showsWithSellers(showIds: string[]) {
  const shows = showIds.length ? await (await col("shows")).find({ id: { $in: showIds } }).toArray() : [];
  const sellers = shows.length
    ? await (await col("users")).find({ id: { $in: [...new Set(shows.map((s) => s.seller_id))] } }, { projection: { id: 1, name: 1 } }).toArray()
    : [];
  const sellerName = new Map(sellers.map((u) => [u.id, u.name]));
  return new Map(shows.filter((s) => sellerName.has(s.seller_id)).map((s) => [s.id, { ...s, seller_name: sellerName.get(s.seller_id)! }]));
}

// Every show this buyer has claimed in, with their bag there (unpaid items, holds, invoices, waiting lines).
export async function getBuyerBags(buyerId: string): Promise<BuyerShowBag[]> {
  const recent = await (await col("claims"))
    .aggregate<{ _id: string }>([
      { $match: { viewer_id: buyerId } },
      { $group: { _id: "$show_id", last_at: { $max: "$created_at" } } },
      { $sort: { last_at: -1 } },
      { $limit: 20 },
    ])
    .toArray();
  const shows = await showsWithSellers(recent.map((r) => r._id));
  return Promise.all(
    recent
      .filter((r) => shows.has(r._id))
      .map(async (r) => {
        const s = shows.get(r._id)!;
        return {
          show: { id: s.id, title: s.title, status: s.status, shipping_cents: s.shipping_cents, seller_name: s.seller_name },
          bag: await getBag(s.id, buyerId),
        };
      }),
  );
}

export async function getBuyerOrders(buyerId: string): Promise<BuyerOrder[]> {
  const orders = await (await col("orders"))
    .find({ viewer_id: buyerId, status: { $nin: ["created", "failed"] } })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();
  const [shows, titles] = await Promise.all([showsWithSellers([...new Set(orders.map((o) => o.show_id))]), orderItemTitles(orders.map((o) => o.id))]);
  return orders
    .filter((o) => shows.has(o.show_id))
    .map((o) => ({
      id: o.id,
      show_id: o.show_id,
      show_title: shows.get(o.show_id)!.title,
      seller_name: shows.get(o.show_id)!.seller_name,
      kind: o.kind,
      status: o.status,
      item_cents: o.item_cents,
      shipping_cents: o.shipping_cents,
      refunded_cents: o.refunded_cents ?? 0,
      carrier: o.carrier,
      tracking_number: o.tracking_number,
      created_at: o.created_at,
      items: titles.get(o.id) ?? null,
    }));
}
