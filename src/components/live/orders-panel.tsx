"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCamera, IconReceipt, IconTruck } from "@/components/ui/icons";
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select, cx, money } from "@/components/ui/kit";
import { DEMO } from "@/lib/demo-script";

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

const KIND: Record<Order["kind"], string> = { bag: "Live checkout", agent: "AI agent", invoice: "PayPal invoice" };

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

  if (!data) return <Card className="h-40 animate-pulse" />;
  const empty = !data.orders.length && !data.open_invoices.length && !data.unpaid_without_invoice;

  return (
    <Card>
      <CardHeader
        title="Orders"
        description="Refunds and tracking go through PayPal. Unpaid bags get one PayPal invoice each when the show ends."
        action={
          data.unpaid_without_invoice > 0 && (
            <Button onClick={sendInvoices} disabled={sending} variant="paypal" size="sm">
              {sending ? "Sending…" : `Send PayPal invoices (${data.unpaid_without_invoice} unpaid)`}
            </Button>
          )
        }
      />

      {empty && (
        <div className="border-t border-line">
          <EmptyState icon={<IconReceipt size={20} />} title="No orders yet">
            Orders appear here as soon as buyers pay with PayPal.
          </EmptyState>
        </div>
      )}

      {(data.open_invoices.length > 0 || data.orders.length > 0) && (
        <ul className="border-t border-line divide-y divide-line">
          {data.open_invoices.map((v) => (
            <li key={v.id} className="px-5 py-4 flex justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  {v.viewer_name} <Badge tone="warn">Invoice sent, unpaid</Badge>
                </p>
                <p className="text-xs text-muted truncate mt-1">{v.items.map((i) => i.title).join(", ")}</p>
              </div>
              <span className="text-sm font-medium tabular-nums shrink-0">{money(v.total_cents)}</span>
            </li>
          ))}
          {data.orders.map((o) => (
            <li key={o.id}>
              <OrderCard showId={showId} order={o} onRefund={refund} onToast={onToast} onChanged={load} />
            </li>
          ))}
        </ul>
      )}
    </Card>
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
      onToast("Label read. Check it, then save.");
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
    onToast(res.ok ? (body.sent_to_paypal ? "Tracking saved and sent to PayPal" : "Tracking saved") : body.error);
    if (res.ok) onChanged();
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex justify-between gap-4">
        <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
          {order.viewer_name}
          <Badge tone="neutral">{KIND[order.kind]}</Badge>
          {order.status === "on_hold" && <Badge tone="warn">On hold, undo window open</Badge>}
          {order.status !== "paid" && order.status !== "on_hold" && <Badge tone="outline">{order.status.replace("_", " ")}</Badge>}
        </p>
        <p className="text-sm font-medium tabular-nums shrink-0 text-right">
          {money(total)}
          {order.refunded_cents > 0 && <span className="block text-[11px] text-brand">−{money(order.refunded_cents)} refunded</span>}
        </p>
      </div>
      <ul className="text-[13px] space-y-1">
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span className={cx(i.status === "refunded" && "line-through text-muted")}>
              {i.title}
              {i.size ? ` (${i.size})` : ""} · {money(i.price_cents)}
            </span>
            {refundable && i.status !== "refunded" && order.items.length > 1 && (
              <button onClick={() => onRefund(order, i)} className="text-xs font-medium text-brand hover:text-ink">
                Refund item
              </button>
            )}
          </li>
        ))}
        {order.shipping_cents > 0 && <li className="text-xs text-muted">Shipping {money(order.shipping_cents)}</li>}
      </ul>

      {order.tracking_number ? (
        <p className="text-xs text-success flex items-center gap-1.5">
          <IconTruck size={15} /> {order.carrier} {order.tracking_number}
        </p>
      ) : (
        order.status === "paid" && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-8 w-24 text-xs">
              {[...new Set(["USPS", "UPS", "FedEx", "DHL", carrier])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Tracking number"
              className="h-8 flex-1 min-w-[140px] text-xs"
              demo={DEMO.trackingNumber}
            />
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && readLabel(e.target.files[0])} />
            <Button onClick={() => fileRef.current?.click()} disabled={reading} variant="secondary" size="sm" title="Snap the shipping label and AI reads the tracking number">
              <IconCamera size={14} /> {reading ? "Reading…" : "Read label"}
            </Button>
            <Button onClick={saveTracking} disabled={!number} size="sm">
              Save
            </Button>
          </div>
        )
      )}

      {refundable && (
        <button onClick={() => onRefund(order, null)} className="text-xs font-medium text-brand hover:text-ink">
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
