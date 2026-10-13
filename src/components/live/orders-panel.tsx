"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "./use-show";

type OrderItem = { id: string; title: string; size: string | null; price_cents: number; status: string };
type Order = {
  id: string;
  viewer_name: string;
  kind: "bag" | "agent" | "invoice";
  status: string;
  item_cents: number;
  shipping_cents: number;
  refunded_cents: number;
  tracking_number: string | null;
  carrier: string | null;
  created_at: number;
  items: OrderItem[];
};
type OpenInvoice = { id: string; viewer_name: string; total_cents: number; expires_at: number; items: OrderItem[] };
type Data = { orders: Order[]; open_invoices: OpenInvoice[]; unpaid_without_invoice: number };

const KIND: Record<Order["kind"], string> = { bag: "PayPal checkout", agent: "🤖 Agent", invoice: "PayPal invoice" };

// The seller's after-show desk: orders, refunds, tracking numbers, invoices.
export default function OrdersPanel({ showId, refreshKey, onToast }: { showId: string; refreshKey: string; onToast: (m: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/shows/${showId}/orders`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [showId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/shows/${showId}/orders`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d && setData(d));
    return () => {
      active = false;
    };
  }, [showId, refreshKey]);

  async function sendInvoices() {
    setSending(true);
    const res = await fetch(`/api/shows/${showId}/invoices`, { method: "POST" });
    const body = await res.json();
    setSending(false);
    onToast(res.ok ? `Sent ${body.sent} PayPal invoice${body.sent === 1 ? "" : "s"}${body.failed ? ` (${body.failed} failed)` : ""}` : body.error);
    void load();
  }

  async function refund(order: Order, item: OrderItem | null) {
    const what = item ? item.title : `the whole order (${money(order.item_cents + order.shipping_cents - order.refunded_cents)})`;
    if (!confirm(`Refund ${what} to ${order.viewer_name} through PayPal?`)) return;
    const res = await fetch(`/api/shows/${showId}/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item?.id ?? null }),
    });
    const body = await res.json();
    onToast(res.ok ? `Refunded ${money(body.amount_cents)} to ${order.viewer_name}` : body.error);
    void load();
  }

  if (!data) return null;
  const empty = !data.orders.length && !data.open_invoices.length && !data.unpaid_without_invoice;

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold">Orders</h2>
          <p className="text-xs text-black/50">Refunds and tracking go through PayPal. Unpaid bags get one PayPal invoice each when the show ends.</p>
        </div>
        {data.unpaid_without_invoice > 0 && (
          <button onClick={sendInvoices} disabled={sending} className="h-9 px-4 rounded-full bg-[#ffc439] text-sm font-semibold disabled:opacity-50">
            {sending ? "Sending…" : `Send PayPal invoices now (${data.unpaid_without_invoice} unpaid item${data.unpaid_without_invoice === 1 ? "" : "s"})`}
          </button>
        )}
      </div>

      {empty && <p className="text-sm text-black/40">No orders yet.</p>}

      {data.open_invoices.map((v) => (
        <div key={v.id} className="rounded-xl border border-dashed border-black/15 p-3 text-sm flex justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {v.viewer_name} <span className="text-xs font-normal text-black/50">· invoice sent, waiting for payment</span>
            </p>
            <p className="text-xs text-black/50 truncate">{v.items.map((i) => i.title).join(", ")}</p>
          </div>
          <span className="font-semibold shrink-0">{money(v.total_cents)}</span>
        </div>
      ))}

      {data.orders.map((o) => (
        <OrderCard key={o.id} showId={showId} order={o} onRefund={refund} onToast={onToast} onChanged={load} />
      ))}
    </section>
  );
}

function OrderCard({
  showId,
  order,
  onRefund,
  onToast,
  onChanged,
}: {
  showId: string;
  order: Order;
  onRefund: (o: Order, i: OrderItem | null) => void;
  onToast: (m: string) => void;
  onChanged: () => void;
}) {
  const [carrier, setCarrier] = useState("USPS");
  const [number, setNumber] = useState("");
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const total = order.item_cents + order.shipping_cents;
  const refundable = order.status === "paid" || order.status === "partially_refunded";

  async function readLabel(file: File) {
    setReading(true);
    try {
      const image = await toJpeg(file, 1400);
      const res = await fetch(`/api/shows/${showId}/label`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const body = await res.json();
      if (!res.ok) return onToast(body.error);
      setCarrier(body.carrier);
      setNumber(body.tracking_number);
      onToast("🤖 Label read. Check it, then Save.");
    } finally {
      setReading(false);
    }
  }

  async function saveTracking() {
    const res = await fetch(`/api/shows/${showId}/orders/${order.id}/tracking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier, trackingNumber: number }),
    });
    const body = await res.json();
    onToast(res.ok ? (body.sent_to_paypal ? "📦 Tracking saved and sent to PayPal" : "📦 Tracking saved") : body.error);
    if (res.ok) onChanged();
  }

  return (
    <div className="rounded-xl border border-black/10 p-3 space-y-2">
      <div className="flex justify-between gap-3">
        <p className="font-semibold">
          {order.viewer_name} <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-black/5 ml-1">{KIND[order.kind]}</span>
          {order.status !== "paid" && order.status !== "on_hold" && (
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-red-50 text-red-700 ml-1">{order.status.replace("_", " ")}</span>
          )}
          {order.status === "on_hold" && <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ml-1">on hold (undo window)</span>}
        </p>
        <p className="font-semibold shrink-0">
          {money(total)}
          {order.refunded_cents > 0 && <span className="block text-[11px] text-red-600 text-right">−{money(order.refunded_cents)} refunded</span>}
        </p>
      </div>
      <ul className="text-sm space-y-1">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span className={i.status === "refunded" ? "line-through text-black/40" : ""}>
              {i.title}
              {i.size ? ` (${i.size})` : ""} · {money(i.price_cents)}
            </span>
            {refundable && i.status !== "refunded" && order.items.length > 1 && (
              <button onClick={() => onRefund(order, i)} className="text-[11px] text-red-600 underline">
                Refund item
              </button>
            )}
          </li>
        ))}
        {order.shipping_cents > 0 && <li className="text-xs text-black/50">Shipping {money(order.shipping_cents)}</li>}
      </ul>

      {order.tracking_number ? (
        <p className="text-xs text-emerald-700">📦 {order.carrier} {order.tracking_number}</p>
      ) : (
        order.status === "paid" && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-8 rounded-lg border border-black/10 text-xs px-1 bg-white">
              {[...new Set(["USPS", "UPS", "FedEx", "DHL", carrier])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Tracking number"
              className="h-8 flex-1 min-w-[140px] rounded-lg border border-black/10 px-2 text-xs"
            />
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && readLabel(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={reading} className="h-8 px-3 rounded-full border border-black/10 text-xs font-semibold">
              {reading ? "Reading…" : "📷 Read label"}
            </button>
            <button onClick={saveTracking} disabled={!number} className="h-8 px-3 rounded-full bg-black text-white text-xs font-semibold disabled:opacity-40">
              Save
            </button>
          </div>
        )
      )}

      {refundable && (
        <button onClick={() => onRefund(order, null)} className="text-xs text-red-600 underline">
          Refund {order.items.length > 1 ? "everything left" : "order"}
        </button>
      )}
    </div>
  );
}

// Resize a photo in the browser before sending it (labels need detail, but not 12 megapixels).
async function toJpeg(file: File, maxSide: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
