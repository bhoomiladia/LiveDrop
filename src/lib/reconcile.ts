import "server-only";
import { getDb } from "./db";
import { getShow } from "./live";
import { searchTransactions } from "./paypal";

// Bookkeeping: check every Live Drop sale against PayPal's own records (Transaction Search),
// and report PayPal's fees and the seller's net.

export async function reconcileShow(showId: string) {
  const show = getShow(showId);
  if (!show) throw new Error("Show not found.");
  const orders = getDb()
    .prepare("SELECT id, viewer_name, kind, capture_id, item_cents, shipping_cents, refunded_cents, created_at FROM orders WHERE show_id = ? AND status IN ('paid', 'partially_refunded', 'refunded')")
    .all(showId) as { id: string; viewer_name: string; kind: string; capture_id: string | null; item_cents: number; shipping_cents: number; refunded_cents: number; created_at: number }[];
  if (!orders.length) return { show: show.title, checked: 0, matched: 0, missing: [], fees: 0, gross: 0, net: 0, note: "No paid orders yet." };

  const start = Math.min(...orders.map((o) => o.created_at)) - 86_400_000;
  const transactions = await searchTransactions(new Date(start), new Date());
  const byId = new Map(transactions.map((t) => [t.id, t]));

  let matched = 0;
  let fees = 0;
  let gross = 0;
  const missing: { order: string; buyer: string; amount: number; reason: string }[] = [];
  for (const o of orders) {
    const amount = (o.item_cents + o.shipping_cents) / 100;
    const t = o.capture_id ? byId.get(o.capture_id) : undefined;
    if (t) {
      matched++;
      fees += Math.abs(t.fee);
      gross += t.amount;
    } else {
      missing.push({
        order: o.id.slice(0, 8),
        buyer: o.viewer_name,
        amount,
        reason: !o.capture_id ? "no PayPal payment reference" : "not in PayPal's records yet (new payments can take up to a few hours to appear)",
      });
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    show: show.title,
    checked: orders.length,
    matched,
    missing,
    gross: round(gross),
    fees: round(fees),
    net: round(gross - fees),
    note: missing.length ? "Some sales aren't in PayPal's transaction list yet." : "Every sale matches PayPal's records.",
  };
}
