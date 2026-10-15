"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandLogo from "@/components/brand/brand-logo";
import { PayBy, UndoButton } from "@/components/dashboard/buyer-orders";
import AgentPanel from "@/components/live/agent-panel";
import ChatLine from "@/components/live/chat-line";
import LiveVideo from "@/components/live/live-video";
import PayPalCheckoutButton from "@/components/live/paypal-checkout-button";
import ToastStack from "@/components/live/toasts";
import { savings, useShow, type LiveItem } from "@/components/live/use-show";
import { IconArrowLeft, IconBag, IconBolt, IconEye, IconSpark } from "@/components/ui/icons";
import { Badge, Button, ButtonLink, Card, Input, LiveBadge, Thumb, cx, money } from "@/components/ui/kit";

type Account = { name: string; role: "seller" | "buyer" | null } | null;

export default function LiveRoom({ showId, paypalClientId }: { showId: string; paypalClientId: string }) {
  const { snap, error, connected, viewers, toasts, pushToast, refreshBag } = useShow(showId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const chatBox = useRef<HTMLDivElement>(null);

  const listed = useMemo(() => (snap?.items ?? []).filter((i) => i.listed_at).sort((a, b) => (b.listed_at ?? 0) - (a.listed_at ?? 0)), [snap?.items]);
  const current = listed[0];
  const earlier = listed.slice(1);

  useEffect(() => {
    const box = chatBox.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [snap?.messages.length]);

  if (error) return <Centered>{error}</Centered>;
  if (!snap) return <Centered>Joining the show…</Centered>;

  const canShop = Boolean(snap.viewer);
  const isLive = snap.show.status === "live";
  const here = `/live/${showId}`;

  async function send(message: string) {
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/shows/${showId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    setSending(false);
    const body = await res.json();
    if (!res.ok) return pushToast(body.error || "Message not sent.", "info");
    setText("");
    // Backup in case a live update is missed: re-check the bag after a claim.
    if (body.kind === "claim") void refreshBag();
    if (body.kind === "pending") setTimeout(() => void refreshBag(), 8000);
  }

  async function undo(orderId: string) {
    const res = await fetch("/api/agents/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
    const body = await res.json();
    pushToast(res.ok ? "Undone. The hold was released, nothing was charged." : body.error, "info");
    void refreshBag();
  }

  async function claim(itemId: string) {
    const res = await fetch(`/api/shows/${showId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const body = await res.json();
    if (!res.ok) return pushToast(body.error || "Couldn't claim that.", "info");
    pushToast(body.status === "won" ? "It's yours. Pay in your bag." : "You're in line for it.", "claim");
    void refreshBag();
  }

  const bag = snap.bag;
  const unpaid = bag?.lines.filter((l) => l.status === "won") ?? [];
  const unpaidTotal = unpaid.reduce((s, l) => s + l.price_cents, 0);
  const shipping = unpaid.length ? bag!.shipping_cents : 0;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 h-14 px-4 md:px-6 flex items-center justify-between gap-3 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={snap.account ? "/dashboard" : "/"} className="text-muted hover:text-ink shrink-0" aria-label="Back">
            <IconArrowLeft size={18} />
          </Link>
          <BrandLogo size="sm" className="shrink-0 hidden sm:inline-flex" />
          <span className="hidden sm:block w-px h-5 bg-line-strong" />
          <span className="text-sm font-medium truncate">{snap.show.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          {isLive ? <LiveBadge /> : <Badge tone="neutral">{snap.show.status === "ended" ? "Ended" : "Starting soon"}</Badge>}
          <span className="hidden sm:inline-flex items-center gap-1 text-muted tabular-nums">
            <IconEye size={15} /> {viewers}
          </span>
          <span className={cx("w-2 h-2 rounded-full", connected ? "bg-success" : "bg-warn")} title={connected ? "Connected" : "Reconnecting"} />
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto p-4 md:p-6 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5 min-w-0">
          {snap.show.is_demo ? <DemoStage image={current?.image_data ?? null} /> : <LiveVideo showId={showId} live={isLive} />}
          <CurrentItem
            item={current}
            isLive={isLive}
            canShop={canShop}
            signInHref={`/login?callbackUrl=${encodeURIComponent(here)}`}
            mine={Boolean(current && snap.bag?.lines.some((l) => l.item_id === current.id))}
            onClaim={() => send("SOLD")}
            onBid={(cents) => send(`${cents / 100}`)}
          />

          {earlier.length > 0 && (
            <div>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted mb-3">Earlier in this show</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {earlier.map((i) => (
                  <div key={i.id} className="shrink-0 w-40 bg-paper rounded-[10px] border border-line p-2">
                    <Thumb src={i.image_data} className="w-full aspect-square mb-2" />
                    <p className="text-[13px] font-medium truncate px-0.5">{i.title}</p>
                    <p className="text-xs text-muted px-0.5">{statusLine(i)}</p>
                    {isLive && canShop && i.status === "listed" && (
                      <Button onClick={() => claim(i.id)} variant="brand" size="sm" className="mt-2 w-full">
                        Still available · Claim
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {!canShop ? (
            <SignInCard account={snap.account} here={here} isDemo={Boolean(snap.show.is_demo)} />
          ) : (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold flex items-center gap-2">
                  <IconBag size={18} className="text-brand" /> Your bag
                </h2>
                <Link href="/dashboard/orders" className="text-xs text-muted hover:text-ink truncate max-w-[50%]">
                  {snap.viewer!.name}
                </Link>
              </div>
              {bag?.waiting.length ? (
                <ul className="mb-3 space-y-1.5">
                  {bag.waiting.map((w) => (
                    <li key={w.item_id} className="text-xs rounded-[6px] bg-warn-tint text-warn px-3 py-2">
                      You&apos;re <b>#{w.position}</b> in line for {w.title}. If the buyer doesn&apos;t pay in time, it&apos;s yours.
                    </li>
                  ))}
                </ul>
              ) : null}
              {bag?.invoice && (
                <div className="mb-3 rounded-[8px] border border-line p-3 flex gap-3 items-center">
                  {bag.invoice.qr_png && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bag.invoice.qr_png} alt="Scan to pay with PayPal" className="w-20 h-20 shrink-0" />
                  )}
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium">PayPal invoice · {money(bag.invoice.total_cents)}</p>
                    <p className="text-[11px] text-muted">
                      Everything you claimed, one shipping fee. Due{" "}
                      {new Date(bag.invoice.expires_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.
                    </p>
                    {bag.invoice.payer_url && (
                      <a href={bag.invoice.payer_url} target="_blank" rel="noreferrer" className="inline-flex h-8 px-3 rounded-[5px] bg-paypal text-ink text-[13px] font-medium items-center">
                        Pay invoice
                      </a>
                    )}
                  </div>
                </div>
              )}
              {!bag?.lines.length ? (
                !bag?.waiting.length && (
                  <p className="text-[13px] text-muted leading-relaxed">
                    Tap <b className="text-ink">Claim</b> or type <b className="text-ink">SOLD</b> in the chat when you see something you love. First claim wins.
                  </p>
                )
              ) : (
                <>
                  <ul className="space-y-2 mb-3">
                    {bag.lines.map((l) => (
                      <li key={l.item_id} className="flex justify-between text-sm gap-3">
                        <span className="truncate">
                          {l.title}
                          {l.size ? <span className="text-muted"> · {l.size}</span> : ""}
                        </span>
                        <span className="text-right shrink-0">
                          {l.status === "paid" ? (
                            <Badge tone="success">Paid</Badge>
                          ) : l.status === "on_hold" ? (
                            <span className="tabular-nums">{money(l.price_cents)} on hold</span>
                          ) : l.status === "invoiced" ? (
                            <span className="tabular-nums">{money(l.price_cents)} · invoiced</span>
                          ) : (
                            <span className="tabular-nums font-medium">{money(l.price_cents)}</span>
                          )}
                          {l.status === "on_hold" && l.order_id && l.undo_until && (
                            <span className="block">
                              <UndoButton deadline={l.undo_until} onUndo={() => undo(l.order_id!)} />
                            </span>
                          )}
                          {l.status === "won" && l.pay_by && (
                            <span className="block">
                              <PayBy deadline={l.pay_by} />
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {unpaid.length > 0 && (
                    <>
                      <div className="text-sm border-t border-line pt-3 mb-3 space-y-1">
                        <div className="flex justify-between text-muted">
                          <span>Shipping (once per show)</span>
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
                          const res = await fetch(`/api/shows/${showId}/checkout`, { method: "POST" });
                          const body = await res.json();
                          if (!res.ok) throw new Error(body.error || "Checkout failed.");
                          return { orderId: body.paypalOrderId };
                        }}
                        onApproved={async (orderId) => {
                          const res = await fetch(`/api/shows/${showId}/checkout`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ paypalOrderId: orderId }),
                          });
                          const body = await res.json();
                          if (!res.ok) pushToast(body.error || "Payment failed.", "info");
                          await refreshBag();
                        }}
                        onError={(m) => pushToast(m, "info")}
                      />
                      <p className="text-[11px] text-muted mt-2 text-center">Protected by PayPal Purchase Protection · Sandbox test money</p>
                    </>
                  )}
                </>
              )}
            </Card>
          )}

          {canShop && <AgentPanel showId={showId} onToast={(m) => pushToast(m, "info")} />}

          <Card className="flex flex-col h-[440px]">
            <div className="px-4 h-12 flex items-center justify-between border-b border-line shrink-0">
              <h2 className="text-sm font-semibold">Chat</h2>
              <span className="text-[11px] text-muted">The shop assistant answers questions</span>
            </div>
            <div ref={chatBox} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {snap.messages.length === 0 && <p className="text-muted text-center mt-8 text-[13px]">Chat is quiet. Say hi.</p>}
              {snap.messages.map((m) => (
                <ChatLine key={m.id} m={m} replyTo={m.reply_to ? snap.messages.find((x) => x.id === m.reply_to) : undefined} />
              ))}
            </div>
            <form
              className="p-2.5 border-t border-line flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(text);
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!isLive || sending || !canShop}
                maxLength={280}
                placeholder={!canShop ? "Sign in as a buyer to chat" : isLive ? 'Ask a question, or type "SOLD"' : "Chat opens when the show is live"}
              />
              <Button disabled={!isLive || sending || !text.trim() || !canShop}>Send</Button>
            </form>
          </Card>
        </aside>
      </main>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function statusLine(i: LiveItem) {
  if (i.status === "paid" || i.status === "shipped") return `Sold to ${i.winner_name ?? "a buyer"}`;
  if (i.status === "claimed") return `Claimed by ${i.winner_name}`;
  if (i.status === "on_hold") return `Bought by ${i.winner_name}`;
  return money(i.price_cents);
}

// Shown instead of the bag when the visitor can't buy: signed out, a seller account, or setup not finished.
function SignInCard({ account, here, isDemo }: { account: Account; here: string; isDemo: boolean }) {
  const next = encodeURIComponent(here);
  if (account?.role === "seller") {
    return (
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">You&apos;re watching as a seller</h2>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
          Seller accounts can watch any show. To claim and pay, sign in with a buyer account.
        </p>
        <ButtonLink href="/dashboard" variant="secondary" size="sm" className="mt-4">
          Back to your dashboard
        </ButtonLink>
      </Card>
    );
  }
  if (account && !account.role) {
    return (
      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Finish setting up your account</h2>
        <p className="text-[13px] text-muted mt-1.5">Choose a buyer account to claim and pay in this show.</p>
        <ButtonLink href={`/onboarding?next=${next}`} size="sm" className="mt-4">
          Finish setup
        </ButtonLink>
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">Sign in to shop this show</h2>
      <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
        Anyone can watch. To claim items, bid, chat and pay with PayPal, sign in with a buyer account. You&apos;ll come right back here.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ButtonLink href={`/login?callbackUrl=${next}`} variant="secondary">
          Sign in
        </ButtonLink>
        <ButtonLink href={`/signup?role=buyer&callbackUrl=${next}`}>Create account</ButtonLink>
      </div>
      {isDemo && (
        <a href="/api/judge/buyer" className="mt-3 block text-center text-[13px] font-medium text-brand hover:text-ink">
          Judging? Continue as a demo buyer
        </a>
      )}
    </Card>
  );
}

function CurrentItem({
  item,
  isLive,
  canShop,
  signInHref,
  mine,
  onClaim,
  onBid,
}: {
  item?: LiveItem;
  isLive: boolean;
  canShop: boolean;
  signInHref: string;
  mine: boolean;
  onClaim: () => void;
  onBid: (cents: number) => void;
}) {
  if (!item) {
    return (
      <Card className="py-14 px-6 text-center">
        <p className="text-xl font-[450] tracking-[-0.02em]">{isLive ? "The first item is coming up" : "The show hasn't started yet"}</p>
        <p className="text-muted text-sm mt-2">Keep this page open. Items appear here the moment the seller shows them.</p>
      </Card>
    );
  }
  const auction = item.status === "listed" && Boolean(item.auction_ends_at) && !item.auction_closed;
  const open = item.status === "listed" && !auction;
  const save = savings(item);
  return (
    <Card className="overflow-hidden grid md:grid-cols-2">
      <div className="relative aspect-square md:aspect-auto bg-canvas md:border-r border-line">
        <Thumb src={item.image_data} alt={item.title} className="absolute inset-0 w-full h-full rounded-none border-0" />
        <span className="absolute top-3 left-3 h-[22px] px-2 rounded-[4px] bg-paper/90 text-[11px] font-medium grid place-items-center tabular-nums">#{item.seq}</span>
      </div>
      <div className="p-5 md:p-6 flex flex-col">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">On screen now</span>
        <h1 className="text-[26px] md:text-[30px] font-[450] tracking-[-0.03em] leading-[1.1] mt-1.5">{item.title}</h1>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.size && <Badge>Size {item.size}</Badge>}
          {item.condition && <Badge className="capitalize">{item.condition}</Badge>}
          {item.ai_status === "pending" && (
            <Badge tone="outline">
              <IconSpark size={12} /> AI is adding details
            </Badge>
          )}
        </div>
        {item.description && <p className="text-ink-soft text-sm mt-3 leading-relaxed">{item.description}</p>}
        {!auction && <p className="text-[40px] font-[450] tracking-[-0.04em] mt-4 leading-none tabular-nums">{money(item.price_cents)}</p>}
        {item.retail_hint && (
          <p className="text-[13px] text-muted mt-2 flex items-center gap-2 flex-wrap">
            {item.retail_hint}
            {save !== null && <Badge tone="success">Save {save}%</Badge>}
          </p>
        )}
        <div className="mt-auto pt-6">
          {auction ? (
            <AuctionBox item={item} isLive={isLive && canShop} onBid={onBid} />
          ) : open ? (
            canShop ? (
              <Button onClick={onClaim} disabled={!isLive} variant="brand" size="lg" className="w-full text-base">
                Claim it
              </Button>
            ) : (
              <ButtonLink href={signInHref} variant="brand" size="lg" className="w-full text-base">
                Sign in to claim
              </ButtonLink>
            )
          ) : (
            <div className={cx("w-full rounded-[8px] p-4 text-center text-sm font-medium", mine ? "bg-success-tint text-success" : "bg-canvas text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]")}>
              {item.status === "paid" || item.status === "shipped"
                ? mine
                  ? "It's yours, paid"
                  : `Sold to ${item.winner_name}`
                : mine
                  ? "It's yours. Pay in your bag."
                  : `Claimed by ${item.winner_name}${item.waiting_count ? ` · ${item.waiting_count} in line` : ""}`}
            </div>
          )}
          {!auction && open && <p className="text-[11px] text-muted mt-2.5 text-center">Or type &ldquo;SOLD&rdquo;, &ldquo;mine&rdquo; or &ldquo;lo quiero&rdquo; in the chat. First claim wins.</p>}
        </div>
      </div>
    </Card>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas text-muted grid place-items-center p-6 text-center text-sm">{children}</div>;
}

// Flash auction: countdown, top bid, and quick bid buttons (bids also work by typing a number in chat).
function AuctionBox({ item, isLive, onBid }: { item: LiveItem; isLive: boolean; onBid: (cents: number) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, (item.auction_ends_at ?? 0) - now);
  const next = item.top_bid_cents ? item.top_bid_cents + 100 : (item.auction_start_cents ?? item.price_cents);
  const secs = Math.ceil(left / 1000);
  return (
    <div className="rounded-[10px] bg-ink text-paper p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.08em] text-brand-light">
          <IconBolt size={14} /> FLASH AUCTION
        </span>
        <span className={cx("text-2xl font-[450] tabular-nums", secs <= 5 && "text-brand-light animate-pulse")}>{left ? `0:${String(secs).padStart(2, "0")}` : "Closing…"}</span>
      </div>
      <div>
        <p className="text-xs text-paper/70">{item.top_bid_cents ? `Top bid · ${item.top_bidder}` : "Starting bid"}</p>
        <p className="text-[36px] font-[450] tracking-[-0.04em] leading-tight tabular-nums">{money(item.top_bid_cents ?? item.auction_start_cents ?? item.price_cents)}</p>
        <p className="text-[11px] text-paper/60">
          {item.bid_count} bid{item.bid_count === 1 ? "" : "s"} · a bid in the last 5s adds 5s
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!isLive || !left} onClick={() => onBid(next)} variant="brand" size="lg">
          Bid {money(next)}
        </Button>
        <button
          disabled={!isLive || !left}
          onClick={() => onBid(next + 400)}
          className="h-12 rounded-[5px] text-[15px] font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)] hover:bg-paper/10 disabled:opacity-45"
        >
          Bid {money(next + 400)}
        </button>
      </div>
      <p className="text-[11px] text-paper/60 text-center">Or type a number in the chat, like &ldquo;25&rdquo; or &ldquo;I&apos;ll go 30&rdquo;.</p>
    </div>
  );
}

// Judge mode: there's no seller camera, so explain what's going on instead of an empty video box.
function DemoStage({ image }: { image: string | null }) {
  return (
    <div className="relative rounded-[10px] overflow-hidden bg-ink aspect-video">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 grid place-items-center text-center p-6 text-paper">
        <div className="max-w-md">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand-light">Demo show</span>
          <p className="text-2xl font-[450] tracking-[-0.02em] mt-2">Rosa is a simulated seller</p>
          <p className="text-sm text-paper/70 mt-2 leading-relaxed">
            In a real show this is the seller&apos;s live camera. Here, a new item goes live every 45 seconds or so. Ava, Leo and Sam are simulated viewers who
            chat and sometimes claim, but never pay. Claim something and pay with PayPal (sandbox).
          </p>
        </div>
      </div>
      <LiveBadge className="absolute top-3 left-3" />
    </div>
  );
}
