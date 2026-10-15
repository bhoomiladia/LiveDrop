"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PayPalCheckoutButton from "@/components/live/paypal-checkout-button";
import type { BuyerOrder, BuyerShowBag } from "@/lib/profile";
import { IconBag, IconClock, IconTruck, IconUndo } from "@/components/ui/icons";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, LiveBadge, Notice, cx, money, timeAgo } from "@/components/ui/kit";
import { ORDER_KIND, OrderStatus } from "./order-status";

// The buyer's bag across every show (pay, undo agent holds, invoices) and their order history.
export default function BuyerOrders({ bags, orders, paypalClientId }: { bags: BuyerShowBag[]; orders: BuyerOrder[]; paypalClientId: string }) {
  const router = useRouter();
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const open = bags.filter((b) => b.bag.lines.some((l) => l.status !== "paid") || b.bag.waiting.length || b.bag.invoice);

  async function undo(orderId: string) {
    const res = await fetch("/api/agents/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
    const body = await res.json();
    setNote(res.ok ? { tone: "success", text: "Undone. The hold was released and nothing was charged." } : { tone: "error", text: body.error });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {note && <Notice tone={note.tone}>{note.text}</Notice>}

      <section>
        <h2 className="text-xl font-[450] tracking-[-0.02em] mb-4">Your bag</h2>
        {open.length ? (
          <div className="space-y-4">
            {open.map(({ show, bag }) => {
              const unpaid = bag.lines.filter((l) => l.status === "won");
              const unpaidTotal = unpaid.reduce((s, l) => s + l.price_cents, 0);
              const shipping = unpaid.length ? bag.shipping_cents : 0;
              return (
                <Card key={show.id}>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2.5">
                        {show.status === "live" && <LiveBadge />}
                        <Link href={`/live/${show.id}`} className="hover:text-ember">
                          {show.title}
                        </Link>
                      </span>
                    }
                    description={`Sold by ${show.seller_name}. Shipping is charged once per show.`}
                    action={
                      show.status === "live" ? (
                        <ButtonLink href={`/live/${show.id}`} variant="secondary" size="sm">
                          Back to show
                        </ButtonLink>
                      ) : undefined
                    }
                  />
                  <ul className="border-t border-line divide-y divide-line">
                    {bag.lines
                      .filter((l) => l.status !== "paid")
                      .map((l) => (
                        <li key={l.item_id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                          <span className="min-w-0 truncate">
                            {l.title}
                            {l.size ? <span className="text-muted"> · {l.size}</span> : null}
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            {l.status === "on_hold" ? (
                              <>
                                <Badge tone="warn">Agent bought it, on hold</Badge>
                                {l.order_id && l.undo_until && <UndoButton deadline={l.undo_until} onUndo={() => undo(l.order_id!)} />}
                              </>
                            ) : l.status === "invoiced" ? (
                              <Badge tone="neutral">On your invoice</Badge>
                            ) : (
                              l.pay_by && <PayBy deadline={l.pay_by} />
                            )}
                            <span className="font-medium tabular-nums w-14 text-right">{money(l.price_cents)}</span>
                          </span>
                        </li>
                      ))}
                    {bag.waiting.map((w) => (
                      <li key={w.item_id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                        <span className="min-w-0 truncate text-muted">{w.title}</span>
                        <Badge tone="outline">#{w.position} in line</Badge>
                      </li>
                    ))}
                  </ul>

                  {bag.invoice && (
                    <div className="border-t border-line px-5 py-4 flex gap-4 items-center">
                      {bag.invoice.qr_png && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bag.invoice.qr_png} alt="Scan to pay with PayPal" className="w-20 h-20 shrink-0 rounded-[6px] border border-line" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">PayPal invoice · {money(bag.invoice.total_cents)}</p>
                        <p className="text-xs text-muted mt-0.5">
                          Everything you claimed, one shipping fee. Due{" "}
                          {new Date(bag.invoice.expires_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.
                        </p>
                      </div>
                      {bag.invoice.payer_url && (
                        <a href={bag.invoice.payer_url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex h-9 px-4 rounded-[5px] bg-paypal text-ink text-sm font-medium items-center">
                          Pay invoice
                        </a>
                      )}
                    </div>
                  )}

                  {unpaid.length > 0 && (
                    <div className="border-t border-line px-5 py-4 space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between text-muted">
                          <span>Shipping</span>
                          <span className="tabular-nums">{money(shipping)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span className="tabular-nums">{money(unpaidTotal + shipping)}</span>
                        </div>
                      </div>
                      <PayPalCheckoutButton
                        clientId={paypalClientId}
                        label={`· ${money(unpaidTotal + shipping)}`}
                        createOrder={async () => {
                          const res = await fetch(`/api/shows/${show.id}/checkout`, { method: "POST" });
                          const body = await res.json();
                          if (!res.ok) throw new Error(body.error || "Checkout failed.");
                          return { orderId: body.paypalOrderId };
                        }}
                        onApproved={async (orderId) => {
                          const res = await fetch(`/api/shows/${show.id}/checkout`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ paypalOrderId: orderId }),
                          });
                          const body = await res.json();
                          setNote(res.ok ? { tone: "success", text: "Paid. Thank you! The seller has been notified." } : { tone: "error", text: body.error || "Payment failed." });
                          router.refresh();
                        }}
                        onError={(m) => setNote({ tone: "error", text: m })}
                      />
                      <p className="text-[11px] text-muted text-center">Protected by PayPal Purchase Protection · Sandbox test money</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<IconBag size={20} />}
              title="Your bag is empty"
              action={
                <ButtonLink href="/dashboard/browse" size="sm">
                  Find a live show
                </ButtonLink>
              }
            >
              Claim items in a live show by tapping Claim or typing SOLD. They wait here until you pay.
            </EmptyState>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-xl font-[450] tracking-[-0.02em] mb-4">Order history</h2>
        <Card>
          {orders.length ? (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.items ?? "Order"}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {o.show_title} · {o.seller_name} · {ORDER_KIND[o.kind] ?? o.kind} · {timeAgo(o.created_at)}
                    </p>
                    {o.tracking_number && (
                      <p className="text-xs text-success mt-1.5 flex items-center gap-1.5">
                        <IconTruck size={14} /> {o.carrier} {o.tracking_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <OrderStatus status={o.status} shipped={Boolean(o.tracking_number)} />
                    <span className="text-sm font-medium tabular-nums w-16 text-right">
                      {money(o.item_cents + o.shipping_cents)}
                      {o.refunded_cents > 0 && <span className="block text-[11px] text-ember font-normal">−{money(o.refunded_cents)}</span>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No orders yet">Paid orders, tracking numbers and refunds show up here.</EmptyState>
          )}
        </Card>
      </section>
    </div>
  );
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function clock(left: number) {
  return `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
}

// "Pay within 4:12": unpaid claims pass to the next person in line when this hits zero.
export function PayBy({ deadline }: { deadline: number }) {
  const left = Math.max(0, deadline - useNow(1000));
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs tabular-nums", left < 60_000 ? "text-ember font-medium" : "text-muted")}>
      <IconClock size={13} />
      {left > 0 ? `pay within ${clock(left)}` : "time's up"}
    </span>
  );
}

// Agent purchases can be undone until the undo window ends; then PayPal completes the payment.
export function UndoButton({ deadline, onUndo }: { deadline: number; onUndo: () => void }) {
  const left = Math.max(0, deadline - useNow(1000));
  if (!left) return <span className="text-xs text-muted">completing payment…</span>;
  return (
    <button onClick={onUndo} className="inline-flex items-center gap-1 text-xs font-medium text-ember hover:text-ink tabular-nums">
      <IconUndo size={13} /> Undo ({clock(left)})
    </button>
  );
}
