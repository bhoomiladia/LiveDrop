"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AgentPanel from "@/components/live/agent-panel";
import ChatLine from "@/components/live/chat-line";
import LiveVideo from "@/components/live/live-video";
import PayPalCheckoutButton from "@/components/live/paypal-checkout-button";
import { money, savings, useShow, type LiveItem } from "@/components/live/use-show";

export default function LiveRoom({ showId, paypalClientId }: { showId: string; paypalClientId: string }) {
  const { snap, error, connected, viewers, toasts, pushToast, refreshBag, rejoin } = useShow(showId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const listed = useMemo(() => (snap?.items ?? []).filter((i) => i.listed_at).sort((a, b) => (b.listed_at ?? 0) - (a.listed_at ?? 0)), [snap?.items]);
  const current = listed[0];
  const earlier = listed.slice(1);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [snap?.messages.length]);

  if (error) return <Centered>{error}</Centered>;
  if (!snap) return <Centered>Joining the show…</Centered>;
  if (!snap.viewer) return <NamePrompt onDone={rejoin} />;

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
    pushToast(body.status === "won" ? "It's yours! Pay in your bag." : "You're in line for it.", "claim");
    void refreshBag();
  }

  const bag = snap.bag;
  const unpaid = bag?.lines.filter((l) => l.status === "won") ?? [];
  const unpaidTotal = unpaid.reduce((s, l) => s + l.price_cents, 0);
  const shipping = unpaid.length ? bag!.shipping_cents : 0;
  const isLive = snap.show.status === "live";

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <header className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-extrabold tracking-tight">🔴 Live Drop</span>
          <span className="text-white/50 truncate text-sm">{snap.show.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {isLive ? (
            <span className="px-2 py-0.5 rounded bg-red-600 font-bold tracking-wide">LIVE</span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-white/10">{snap.show.status === "ended" ? "ENDED" : "STARTING SOON"}</span>
          )}
          <span className="text-white/60">👀 {viewers}</span>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} title={connected ? "Connected" : "Reconnecting"} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 min-w-0">
          {snap.show.is_demo ? <DemoStage image={current?.image_data ?? null} /> : <LiveVideo showId={showId} live={isLive} />}
          <CurrentItem item={current} isLive={isLive} mine={Boolean(current && snap.bag?.lines.some((l) => l.item_id === current.id))} onClaim={() => send("SOLD")} onBid={(cents) => send(`${cents / 100}`)} />

          {earlier.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">Earlier in this show</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {earlier.map((i) => (
                  <div key={i.id} className="shrink-0 w-36 rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="aspect-square rounded-lg bg-white/10 overflow-hidden mb-2">
                      {i.image_data && <img src={i.image_data} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-xs font-medium truncate">{i.title}</p>
                    <p className="text-[11px] text-white/50">{statusLine(i)}</p>
                    {isLive && i.status === "listed" && (
                      <button onClick={() => claim(i.id)} className="mt-1.5 w-full h-7 rounded-full bg-amber-400 text-black text-[11px] font-bold">
                        Up for grabs · Claim
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white text-[#0b0d12] p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Your bag</h2>
              <span className="text-xs text-black/50">Hi, {snap.viewer.name}</span>
            </div>
            {bag?.waiting.length ? (
              <ul className="mb-3 space-y-1">
                {bag.waiting.map((w) => (
                  <li key={w.item_id} className="text-xs rounded-lg bg-amber-50 text-amber-800 px-2.5 py-1.5">
                    You&apos;re <b>#{w.position}</b> in line for {w.title}. If the buyer doesn&apos;t pay in time, it&apos;s yours.
                  </li>
                ))}
              </ul>
            ) : null}
            {bag?.invoice && (
              <div className="mb-3 rounded-xl border border-black/10 p-3 flex gap-3 items-center">
                {bag.invoice.qr_png && <img src={bag.invoice.qr_png} alt="Scan to pay with PayPal" className="w-24 h-24 shrink-0" />}
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-bold">Your PayPal invoice: {money(bag.invoice.total_cents)}</p>
                  <p className="text-[11px] text-black/50">Everything you claimed, one shipping fee. Scan the code or tap below. Due by {new Date(bag.invoice.expires_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.</p>
                  {bag.invoice.payer_url && (
                    <a href={bag.invoice.payer_url} target="_blank" rel="noreferrer" className="inline-flex h-9 px-4 rounded-full bg-[#ffc439] text-black text-sm font-semibold items-center">
                      Pay invoice with PayPal
                    </a>
                  )}
                </div>
              </div>
            )}
            {!bag?.lines.length ? (
              !bag?.waiting.length && <p className="text-sm text-black/60">Type <b>SOLD</b> in the chat when you see something you love.</p>
            ) : (
              <>
                <ul className="space-y-1.5 mb-3">
                  {bag.lines.map((l) => (
                    <li key={l.item_id} className="flex justify-between text-sm gap-2">
                      <span className="truncate">
                        {l.title}
                        {l.size ? ` (${l.size})` : ""}
                      </span>
                      <span className={`text-right shrink-0 ${l.status === "paid" ? "text-emerald-600 font-medium" : ""}`}>
                        {l.status === "paid"
                          ? "Paid ✓"
                          : l.status === "on_hold"
                            ? `🤖 ${money(l.price_cents)} on hold`
                            : l.status === "invoiced"
                              ? `${money(l.price_cents)} · on invoice`
                              : money(l.price_cents)}
                        {l.status === "on_hold" && l.order_id && l.undo_until && (
                          <UndoButton deadline={l.undo_until} onUndo={() => undo(l.order_id!)} />
                        )}
                        {l.status === "won" && l.pay_by && <PayBy deadline={l.pay_by} />}
                      </span>
                    </li>
                  ))}
                </ul>
                {unpaid.length > 0 && (
                  <>
                    <div className="text-sm border-t border-black/10 pt-2 mb-3 space-y-0.5">
                      <div className="flex justify-between text-black/60">
                        <span>Shipping (once per show)</span>
                        <span>{money(shipping)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{money(unpaidTotal + shipping)}</span>
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
                    <p className="text-[11px] text-black/50 mt-2 text-center">Protected by PayPal Purchase Protection · Sandbox test money</p>
                  </>
                )}
              </>
            )}
          </div>

          <AgentPanel showId={showId} onToast={(m) => pushToast(m, "info")} />

          <div className="rounded-2xl bg-white/5 border border-white/10 flex flex-col h-[420px]">
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
              {snap.messages.length === 0 && <p className="text-white/40 text-center mt-8">Chat is quiet. Say hi!</p>}
              {snap.messages.map((m) => (
                <ChatLine key={m.id} m={m} dark replyTo={m.reply_to ? snap.messages.find((x) => x.id === m.reply_to) : undefined} />
              ))}
              <div ref={chatEnd} />
            </div>
            <form
              className="p-2 border-t border-white/10 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(text);
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!isLive || sending}
                maxLength={280}
                placeholder={isLive ? 'Ask a question, or type "SOLD"' : "Chat opens when the show is live"}
                className="flex-1 min-w-0 h-10 rounded-full bg-white/10 px-4 text-sm placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30"
              />
              <button disabled={!isLive || sending || !text.trim()} className="h-10 px-4 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-40">
                Send
              </button>
            </form>
          </div>
        </aside>
      </main>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2 z-50 w-[min(92vw,420px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg text-center ${
              t.tone === "paid" ? "bg-emerald-500 text-white" : t.tone === "claim" ? "bg-amber-400 text-black" : "bg-white text-black"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function statusLine(i: LiveItem) {
  if (i.status === "paid" || i.status === "shipped") return `Sold to ${i.winner_name ?? "a buyer"}`;
  if (i.status === "claimed") return `Claimed by ${i.winner_name}`;
  if (i.status === "on_hold") return `Bought by ${i.winner_name}`;
  return money(i.price_cents);
}

function CurrentItem({
  item,
  isLive,
  mine,
  onClaim,
  onBid,
}: {
  item?: LiveItem;
  isLive: boolean;
  mine: boolean;
  onClaim: () => void;
  onBid: (cents: number) => void;
}) {
  if (!item) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 aspect-video grid place-items-center text-center p-6">
        <div>
          <p className="text-2xl font-bold mb-1">{isLive ? "The first item is coming up…" : "The show hasn't started yet"}</p>
          <p className="text-white/50 text-sm">Keep this page open. Items appear here the moment the seller shows them.</p>
        </div>
      </div>
    );
  }
  const auction = item.status === "listed" && Boolean(item.auction_ends_at) && !item.auction_closed;
  const open = item.status === "listed" && !auction;
  return (
    <div className="rounded-3xl overflow-hidden bg-white/5 border border-white/10 grid md:grid-cols-2">
      <div className="aspect-square md:aspect-auto bg-black/40 relative">
        {item.image_data ? (
          <img src={item.image_data} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-white/30 text-6xl">🛍️</div>
        )}
        <span className="absolute top-3 left-3 text-xs font-bold bg-black/60 rounded-full px-2.5 py-1">#{item.seq}</span>
      </div>
      <div className="p-5 md:p-6 flex flex-col">
        <p className="text-xs uppercase tracking-widest text-white/40">On screen now</p>
        <h1 className="text-2xl md:text-3xl font-extrabold mt-1 leading-tight">{item.title}</h1>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {item.size && <span className="px-2 py-1 rounded-full bg-white/10">Size {item.size}</span>}
          {item.condition && <span className="px-2 py-1 rounded-full bg-white/10 capitalize">{item.condition}</span>}
          {item.ai_status === "pending" && <span className="px-2 py-1 rounded-full bg-white/5 text-white/50">✨ AI is adding details…</span>}
        </div>
        {item.description && <p className="text-white/70 text-sm mt-3">{item.description}</p>}
        {!auction && <p className="text-4xl font-black mt-4">{money(item.price_cents)}</p>}
        {item.retail_hint && (
          <p className="text-sm text-emerald-300 mt-1">
            {item.retail_hint}
            {savings(item) !== null && <span className="ml-2 rounded-full bg-emerald-400 text-black font-bold px-2 py-0.5 text-xs">Save {savings(item)}%</span>}
          </p>
        )}
        <div className="mt-auto pt-5">
          {auction ? (
            <AuctionBox item={item} isLive={isLive} onBid={onBid} />
          ) : open ? (
            <button onClick={onClaim} disabled={!isLive} className="w-full h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-lg font-black tracking-wide disabled:opacity-50">
              SOLD! Claim it
            </button>
          ) : (
            <div className={`w-full rounded-2xl p-4 text-center font-bold ${mine ? "bg-emerald-500 text-white" : "bg-white/10"}`}>
              {item.status === "paid" || item.status === "shipped"
                ? mine
                  ? "It's yours, paid ✓"
                  : `Sold to ${item.winner_name}`
                : mine
                  ? "It's yours! Pay in your bag →"
                  : `Claimed by ${item.winner_name}${item.waiting_count ? ` · ${item.waiting_count} in line` : ""}`}
            </div>
          )}
          {!auction && (
            <p className="text-[11px] text-white/40 mt-2 text-center">Or type “SOLD” / “mine” / “lo quiero” in the chat. First claim wins.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NamePrompt({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Centered>
      <form
        className="w-full max-w-sm bg-white text-black rounded-3xl p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/viewer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
          if (!res.ok) setErr((await res.json()).error);
          else onDone();
        }}
      >
        <div>
          <h1 className="text-xl font-extrabold">🔴 Join the show</h1>
          <p className="text-sm text-black/60 mt-1">Pick a name so the seller knows who claimed what. No account needed.</p>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="w-full h-11 rounded-xl border border-black/15 px-3 outline-none focus:ring-2 focus:ring-black/20"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full h-11 rounded-full bg-black text-white font-semibold">Enter</button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0b0d12] text-white grid place-items-center p-6 text-center">{children}</div>;
}

// "Pay within 4:12": unpaid claims pass to the next person in line when this hits zero.
function PayBy({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, deadline - now);
  const m = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return (
    <span className={`block text-[11px] font-semibold ${left < 60_000 ? "text-red-600" : "text-black/50"}`}>
      {left > 0 ? `pay within ${m}:${String(sec).padStart(2, "0")}` : "time's up…"}
    </span>
  );
}

// Agent purchases can be undone until the undo window ends; then PayPal completes the payment.
function UndoButton({ deadline, onUndo }: { deadline: number; onUndo: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, deadline - now);
  if (!left) return <span className="block text-[11px] text-black/50">completing payment…</span>;
  const m = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return (
    <button onClick={onUndo} className="block ml-auto mt-0.5 text-[11px] font-semibold text-violet-700 underline">
      Undo ({m}:{String(sec).padStart(2, "0")})
    </button>
  );
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
    <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600 to-orange-500 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tracking-widest">⚡ FLASH AUCTION</span>
        <span className={`text-2xl font-black tabular-nums ${secs <= 5 ? "animate-pulse" : ""}`}>{left ? `0:${String(secs).padStart(2, "0")}` : "Closing…"}</span>
      </div>
      <div>
        <p className="text-xs text-white/80">{item.top_bid_cents ? `Top bid · ${item.top_bidder}` : "Starting bid"}</p>
        <p className="text-4xl font-black">{money(item.top_bid_cents ?? item.auction_start_cents ?? item.price_cents)}</p>
        <p className="text-[11px] text-white/70">{item.bid_count} bid{item.bid_count === 1 ? "" : "s"} · a bid in the last 5s adds 5s</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={!isLive || !left} onClick={() => onBid(next)} className="h-12 rounded-full bg-white text-black font-black disabled:opacity-50">
          Bid {money(next)}
        </button>
        <button disabled={!isLive || !left} onClick={() => onBid(next + 400)} className="h-12 rounded-full bg-black/30 font-bold disabled:opacity-50">
          Bid {money(next + 400)}
        </button>
      </div>
      <p className="text-[11px] text-white/70 text-center">Or type a number in the chat, like “25” or “I&apos;ll go 30”.</p>
    </div>
  );
}

// Judge mode: there's no seller camera, so explain what's going on instead of an empty video box.
function DemoStage({ image }: { image: string | null }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-white/10">
      {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm scale-110" />}
      <div className="absolute inset-0 grid place-items-center text-center p-6">
        <div className="max-w-md">
          <p className="text-xs font-bold tracking-widest text-red-400">🎬 DEMO SHOW</p>
          <p className="text-xl font-extrabold mt-1">Rosa is a simulated seller</p>
          <p className="text-sm text-white/70 mt-2">
            In a real show this is the seller&apos;s live camera. Here, a new item goes live every ~45 seconds. Ava, Leo and Sam are simulated viewers who
            chat and sometimes claim, but never pay. Claim something and pay with PayPal (sandbox).
          </p>
        </div>
      </div>
      <span className="absolute top-3 left-3 text-xs font-bold bg-red-600 rounded px-2 py-0.5">LIVE</span>
    </div>
  );
}
