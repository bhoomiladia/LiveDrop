"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, Track } from "livekit-client";
import BrandLogo from "@/components/brand/brand-logo";
import ChatLine from "@/components/live/chat-line";
import OrdersPanel from "@/components/live/orders-panel";
import ToastStack from "@/components/live/toasts";
import type { ChatMessage } from "@/components/live/use-show";
import { savings, useShow, type LiveItem } from "@/components/live/use-show";
import { IconArrowLeft, IconBolt, IconBroadcast, IconCamera, IconChart, IconCopy, IconEye, IconMic, IconSpark, IconTag } from "@/components/ui/icons";
import { Badge, Button, ButtonLink, Card, FillButton, Input, LiveBadge, Thumb, cx, money, typeDemo } from "@/components/ui/kit";

// Demo video: each Fill types the next item into the "Or type it" box.
const DEMO_ITEMS = ["Black bucket hat, twenty dollars", "Grey wool scarf, fifteen dollars", "Vintage denim jacket, size medium, forty-five dollars"];

// Minimal typing for the browser's speech recognition (Chrome exposes it as webkitSpeechRecognition).
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const AUTO_LIVE_SECONDS = 3;

export default function StudioRoom({ showId }: { showId: string }) {
  const { snap, setSnap, error, connected, viewers, toasts, pushToast, moneyTick } = useShow(showId);

  // ---- camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    try {
      const video = { facingMode: "environment", width: { ideal: 1280 } };
      // Camera + mic for viewers. If the mic is blocked, still go ahead with video only.
      const stream = await navigator.mediaDevices
        .getUserMedia({ video, audio: { echoCancellation: true, noiseSuppression: true } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video, audio: false }));
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setCameraError(null);
    } catch {
      setCameraError("Camera blocked. Allow camera access in your browser, or list items without a photo.");
    }
  }

  // Small JPEG still from the live video, sent to the AI and shown on the item card.
  function snapshot(): string | null {
    const video = videoRef.current;
    if (!cameraOn || !video || !video.videoWidth) return null;
    const scale = Math.min(1, 512 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  }

  // ---- broadcast: publish the camera and mic to the show's LiveKit room while live
  const showStatus = snap?.show.status;
  const [broadcast, setBroadcast] = useState<"off" | "connecting" | "on" | "error">("off");
  useEffect(() => {
    const stream = streamRef.current;
    if (!cameraOn || showStatus !== "live" || !stream) return;
    let cancelled = false;
    const room = new Room({ dynacast: true });
    (async () => {
      try {
        setBroadcast("connecting");
        const res = await fetch(`/api/shows/${showId}/video-token`, { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        await room.connect(body.url, body.token);
        if (cancelled) return;
        const [videoTrack] = stream.getVideoTracks();
        const [audioTrack] = stream.getAudioTracks();
        if (videoTrack) await room.localParticipant.publishTrack(videoTrack, { source: Track.Source.Camera, simulcast: true });
        if (audioTrack) await room.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone });
        if (!cancelled) setBroadcast("on");
      } catch (err) {
        if (!cancelled) {
          setBroadcast("error");
          console.error("[live video]", err);
        }
      }
    })();
    return () => {
      cancelled = true;
      // Unpublish without stopping the tracks: the seller keeps the local preview.
      void room.disconnect(false);
      setBroadcast("off");
    };
  }, [cameraOn, showStatus, showId]);

  // ---- voice
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState(""); // final words since the last listing
  const [interim, setInterim] = useState("");
  const wantListening = useRef(false);
  const speechSupported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  function startListening() {
    const Ctor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
      .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition: new () => Recognition }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interimText += r[0].transcript;
      }
      if (finalText) setHeard((h) => (h + " " + finalText).trim().slice(-500));
      setInterim(interimText);
    };
    // Chrome stops after silence; restart while the seller wants it on.
    rec.onend = () => {
      if (wantListening.current) {
        try {
          rec.start();
        } catch {}
      } else setListening(false);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        wantListening.current = false;
        setListening(false);
        pushToast("Microphone blocked. You can type instead.", "info");
      }
    };
    recognition.current = rec;
    wantListening.current = true;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    wantListening.current = false;
    recognition.current?.stop();
    setListening(false);
  }

  useEffect(() => () => {
    wantListening.current = false;
    recognition.current?.stop();
  }, []);

  // ---- chat: the seller can reply, e.g. to questions the shop assistant flagged
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // ---- listing
  const [typed, setTyped] = useState("");
  const [listing, setListing] = useState(false);
  const demoStep = useRef(0);

  const listIt = useCallback(
    async (words: string) => {
      const transcript = words.trim();
      if (!transcript) return pushToast("Say (or type) what it is and the price first.", "info");
      setListing(true);
      const res = await fetch(`/api/shows/${showId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, image: snapshot() }),
      });
      const body = await res.json();
      setListing(false);
      if (!res.ok) return pushToast(body.error, "info");
      setHeard("");
      setInterim("");
      setTyped("");
      setSnap((s) => (s && !s.items.some((i) => i.id === body.item.id) ? { ...s, items: [...s.items, body.item] } : s));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showId, cameraOn],
  );

  async function setStatus(status: "live" | "ended") {
    const res = await fetch(`/api/shows/${showId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) pushToast((await res.json()).error, "info");
  }

  const drafts = useMemo(() => (snap?.items ?? []).filter((i) => i.status === "draft"), [snap?.items]);
  const listed = useMemo(
    () => (snap?.items ?? []).filter((i) => i.listed_at).sort((a, b) => (b.listed_at ?? 0) - (a.listed_at ?? 0)),
    [snap?.items],
  );
  const stats = useMemo(() => {
    const paid = listed.filter((i) => i.status === "paid" || i.status === "shipped");
    return {
      listed: listed.length,
      claimed: listed.filter((i) => i.status === "claimed").length,
      paid: paid.length,
      revenue: paid.reduce((s, i) => s + i.price_cents, 0),
    };
  }, [listed]);

  if (error) return <div className="min-h-screen bg-canvas grid place-items-center p-10 text-center text-sm text-muted">{error}</div>;
  if (!snap) return <div className="min-h-screen bg-canvas grid place-items-center p-10 text-center text-sm text-muted">Opening the studio…</div>;

  const isLive = snap.show.status === "live";
  const viewerUrl = typeof window !== "undefined" ? `${window.location.origin}/live/${showId}` : `/live/${showId}`;
  const collected = (snap.totals?.item_cents ?? stats.revenue) + (snap.totals?.shipping_cents ?? 0) - (snap.totals?.refunded_cents ?? 0);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 h-14 px-4 md:px-6 flex items-center justify-between gap-3 bg-paper/95 backdrop-blur border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/shows" className="text-muted hover:text-ink shrink-0" aria-label="Back to your shows">
            <IconArrowLeft size={18} />
          </Link>
          <BrandLogo size="sm" className="shrink-0 hidden md:inline-flex" />
          <span className="hidden md:block w-px h-5 bg-line-strong" />
          <span className="text-sm font-medium truncate">{snap.show.title}</span>
          {isLive ? <LiveBadge className="shrink-0" /> : <Badge tone={snap.show.status === "ended" ? "outline" : "neutral"}>{snap.show.status === "ended" ? "Ended" : "Rehearsal"}</Badge>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted tabular-nums mr-1">
            <span className={cx("w-2 h-2 rounded-full", connected ? "bg-success" : "bg-warn")} />
            <IconEye size={15} /> {Math.max(0, viewers - 1)} watching
          </span>
          <ButtonLink href={`/dashboard/insights?show=${showId}`} variant="ghost" size="sm" className="hidden md:inline-flex">
            <IconChart size={15} /> Insights
          </ButtonLink>
          <Button onClick={() => navigator.clipboard.writeText(viewerUrl).then(() => pushToast("Viewer link copied", "info"))} variant="secondary" size="sm">
            <IconCopy size={15} /> <span className="hidden sm:inline">Viewer link</span>
          </Button>
          {snap.show.status === "scheduled" && (
            <Button onClick={() => setStatus("live")} variant="live" size="sm">
              <IconBroadcast size={15} /> Go live
            </Button>
          )}
          {isLive && (
            <Button onClick={() => confirm("End the show? Unpaid buyers get a PayPal invoice.") && setStatus("ended")} size="sm">
              End show
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 grid gap-5 xl:grid-cols-[1.25fr_1fr_340px]">
        {/* Camera + voice */}
        <section className="space-y-4 min-w-0">
          <div className="relative rounded-[10px] overflow-hidden bg-ink aspect-video">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 grid place-items-center text-center p-6">
                <div>
                  <Button onClick={startCamera} variant="secondary">
                    <IconCamera size={16} /> Turn on camera
                  </Button>
                  {cameraError && <p className="text-paper/70 text-sm mt-3 max-w-xs">{cameraError}</p>}
                </div>
              </div>
            )}
            {isLive && <LiveBadge className="absolute top-3 left-3" />}
            {cameraOn && (
              <span
                className={cx(
                  "absolute top-3 right-3 text-xs font-medium rounded-[4px] px-2 h-[22px] inline-flex items-center",
                  broadcast === "error" ? "bg-brand text-paper" : "bg-ink/70 text-paper",
                )}
              >
                {broadcast === "on"
                  ? "Viewers can see you"
                  : broadcast === "connecting"
                    ? "Connecting video…"
                    : broadcast === "error"
                      ? "Video not reaching viewers"
                      : isLive
                        ? "Starting video…"
                        : "Preview · go live to broadcast"}
              </span>
            )}
            {(heard || interim) && (
              <div className="absolute inset-x-3 bottom-3 rounded-[8px] bg-ink/80 text-paper text-sm p-3">
                {heard} <span className="text-paper/50">{interim}</span>
              </div>
            )}
          </div>

          <Card className="p-5 space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">List an item</h2>
              <p className="text-[13px] text-muted mt-1 leading-relaxed">
                Hold it up and say what it is, the size and the price, like &ldquo;vintage denim jacket, size medium, forty-five dollars&rdquo;. Then tap List it.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {speechSupported ? (
                <Button onClick={listening ? stopListening : startListening} variant={listening ? "danger" : "primary"}>
                  <IconMic size={16} />
                  {listening ? "Listening, tap to stop" : "Start talking"}
                </Button>
              ) : (
                <span className="text-[13px] text-muted">Voice needs Chrome. Type below instead.</span>
              )}
              <Button onClick={() => listIt(heard || interim)} disabled={listing || !(heard || interim)} variant="brand">
                {listing ? "Listing…" : "List it"}
              </Button>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void listIt(typed);
              }}
            >
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type it: wool scarf, forty dollars" />
              <FillButton onClick={() => void typeDemo(DEMO_ITEMS[demoStep.current++ % DEMO_ITEMS.length], setTyped)} />
              <Button disabled={!typed.trim() || listing} variant="secondary">
                List
              </Button>
            </form>
          </Card>
        </section>

        {/* Drafts + listed items */}
        <section className="space-y-4 min-w-0">
          {drafts.map((d) => (
            <DraftCard key={d.id} showId={showId} item={d} isLive={isLive} onError={(m) => pushToast(m, "info")} />
          ))}

          <Card className="grid grid-cols-3 divide-x divide-line">
            <MiniStat label="Listed" value={stats.listed} />
            <MiniStat label="Claimed" value={stats.claimed} />
            <MiniStat label="Paid" value={stats.paid} />
          </Card>
          <Card className="p-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Collected via PayPal</p>
              <p className="text-[28px] font-[450] tracking-[-0.03em] leading-none mt-2 tabular-nums">{money(collected)}</p>
            </div>
            <p className="text-xs text-muted text-right">
              {money(snap.totals?.item_cents ?? stats.revenue)} items
              <br />
              {money(snap.totals?.shipping_cents ?? 0)} shipping{snap.totals?.refunded_cents ? ` · −${money(snap.totals.refunded_cents)} refunds` : ""}
            </p>
          </Card>

          <Card>
            <div className="px-4 h-12 flex items-center border-b border-line">
              <h2 className="text-sm font-semibold">Items in this show</h2>
            </div>
            <ul className="divide-y divide-line">
              {listed.map((i) => (
                <li key={i.id} className="p-3 flex gap-3 items-center">
                  <Thumb src={i.image_data} className="w-12 h-12" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      <span className="text-muted tabular-nums">#{i.seq}</span> {i.title} {i.size && <span className="text-muted font-normal">· {i.size}</span>}
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {money(i.price_cents)}
                      {i.retail_cents ? ` · new from ${money(i.retail_cents)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusPill item={i} />
                    {isLive && i.status === "listed" && !i.auction_ends_at && <AuctionButton showId={showId} item={i} onError={(m) => pushToast(m, "info")} />}
                  </div>
                </li>
              ))}
              {listed.length === 0 && <li className="text-[13px] text-muted p-4">Items you put live appear here.</li>}
            </ul>
          </Card>
        </section>

        {/* Chat */}
        <Card className="flex flex-col h-[640px] xl:sticky xl:top-20">
          <div className="px-4 h-12 flex items-center justify-between border-b border-line shrink-0">
            <h2 className="text-sm font-semibold">Chat</h2>
            <span className="text-[11px] text-muted">Reply to flagged questions</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {snap.messages.map((m) => (
              <ChatLine key={m.id} m={m} replyTo={m.reply_to ? snap.messages.find((x) => x.id === m.reply_to) : undefined} onReply={setReplyTo} />
            ))}
            {snap.messages.length === 0 && <p className="text-muted text-center mt-8 text-[13px]">No messages yet.</p>}
          </div>
          <SellerChatBox showId={showId} replyTo={replyTo} onClearReply={() => setReplyTo(null)} onError={(m) => pushToast(m, "info")} />
        </Card>
      </main>

      {/* After the show: orders, refunds, tracking, invoices. Re-loads whenever an item changes status. */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        <OrdersPanel
          showId={showId}
          refreshKey={`${moneyTick}-${snap.show.status}-${snap.items.map((i) => i.status).join(",")}`}
          onToast={(m) => pushToast(m, "info")}
        />
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

// Seller view of Channel3 results: what similar new items cost, and where.
function RetailHint({ item }: { item: LiveItem }) {
  if (!item.retail_cents) return null;
  let sources: { title: string; brand: string | null; store: string; price_cents: number }[] = [];
  try {
    sources = JSON.parse(item.retail_sources ?? "[]");
  } catch {}
  const save = savings(item);
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer select-none inline-flex items-center gap-1.5">
        <IconTag size={13} /> Similar new items: <b className="text-ink">{money(item.retail_cents)}+</b> in stores
        {save !== null && <span className="text-success font-medium"> · yours is {save}% less</span>}
      </summary>
      <ul className="mt-1.5 space-y-0.5 pl-5 list-disc">
        {sources.map((s, i) => (
          <li key={i}>
            {money(s.price_cents)} · {s.brand ? `${s.brand} · ` : ""}
            {s.title} <span className="text-muted/70">({s.store})</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// The seller's chat box. Replies to flagged questions also teach the shop assistant.
function SellerChatBox({
  showId,
  replyTo,
  onClearReply,
  onError,
}: {
  showId: string;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  onError: (m: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="p-2.5 border-t border-line space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        const res = await fetch(`/api/shows/${showId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, replyTo: replyTo?.id ?? null }),
        });
        setBusy(false);
        if (!res.ok) return onError((await res.json()).error);
        setText("");
        onClearReply();
      }}
    >
      {replyTo && (
        <p className="text-[11px] text-muted flex justify-between gap-2 px-1">
          <span className="truncate">
            Replying to {replyTo.name}: {replyTo.text}
          </span>
          <button type="button" onClick={onClearReply} className="font-medium text-ink shrink-0">
            Cancel
          </button>
        </p>
      )}
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder={replyTo ? "Your answer (your assistant will remember it)" : "Say something to viewers"} />
        <Button disabled={busy || !text.trim()}>Send</Button>
      </div>
    </form>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="text-[26px] font-[450] tracking-[-0.03em] leading-none mt-2 tabular-nums">{value}</p>
    </div>
  );
}

// Starts a flash auction on an open item: bids come from the chat.
function AuctionButton({ showId, item, onError }: { showId: string; item: LiveItem; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function start() {
    const input = prompt("Starting bid in USD (30-second auction):", String(Math.max(1, Math.round(item.price_cents / 100))));
    if (input === null) return;
    setBusy(true);
    const res = await fetch(`/api/shows/${showId}/items/${item.id}/auction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startUsd: Number(input), seconds: 30 }),
    });
    setBusy(false);
    if (!res.ok) onError((await res.json()).error);
  }
  return (
    <button onClick={start} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand hover:text-ink disabled:opacity-50">
      <IconBolt size={13} /> Auction
    </button>
  );
}

function StatusPill({ item }: { item: LiveItem }) {
  const map: Record<string, [string, "neutral" | "warn" | "success" | "brand" | "outline"]> = {
    listed: ["Open", "neutral"],
    claimed: [`Claimed · ${item.winner_name}`, "warn"],
    paid: [`Paid · ${item.winner_name}`, "success"],
    shipped: ["Shipped", "success"],
    on_hold: ["Agent hold", "warn"],
    refunded: ["Refunded", "outline"],
  };
  const auctioning = item.status === "listed" && item.auction_ends_at && !item.auction_closed;
  const [text, tone] = auctioning
    ? ([item.top_bid_cents ? `Auction · ${money(item.top_bid_cents)} ${item.top_bidder}` : "Auction · no bids yet", "brand"] as const)
    : (map[item.status] ?? [item.status, "neutral"]);
  return (
    <Badge tone={tone} className="max-w-[150px]">
      <span className="truncate">{text}</span>
    </Badge>
  );
}

// A new listing: shows what plain code understood instantly, lets the seller fix it,
// and goes live by itself after a short countdown.
function DraftCard({ showId, item, isLive, onError }: { showId: string; item: LiveItem; isLive: boolean; onError: (m: string) => void }) {
  // Fields the seller hasn't touched keep following the item, so the AI's answers
  // (title, size, a price it heard) show up even while the card is open for editing.
  const [edits, setEdits] = useState<{ title?: string; size?: string; price?: string }>({});
  const title = edits.title ?? item.title;
  const size = edits.size ?? item.size ?? "";
  const price = edits.price ?? (item.price_cents ? String(item.price_cents / 100) : "");
  const [manualEdit, setManualEdit] = useState(false);
  // Without a price the card can't go live, so it opens for editing until one is known.
  const editing = manualEdit || !item.price_cents;
  const [countdown, setCountdown] = useState(AUTO_LIVE_SECONDS);
  const [busy, setBusy] = useState(false);

  const goLive = useCallback(async () => {
    setBusy(true);
    if (editing) {
      const res = await fetch(`/api/shows/${showId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, size: size || null, priceUsd: Number(price) }),
      });
      if (!res.ok) {
        setBusy(false);
        return onError((await res.json()).error);
      }
    }
    const res = await fetch(`/api/shows/${showId}/items/${item.id}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) onError((await res.json()).error);
  }, [editing, showId, item.id, title, size, price, onError]);

  useEffect(() => {
    if (editing || !isLive || busy) return;
    const t = setTimeout(() => {
      if (countdown <= 1) void goLive();
      else setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, editing, isLive, busy, goLive]);

  return (
    <Card className="p-4 flex gap-4 border-brand-light shadow-[inset_0_0_0_1px_var(--brand-light)]">
      <Thumb src={item.image_data} className="w-20 h-20" />
      <div className="flex-1 min-w-0 space-y-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">New listing</span>
        {editing ? (
          <div className="grid grid-cols-[1fr_64px_80px] gap-2">
            <Input value={title} onChange={(e) => setEdits((x) => ({ ...x, title: e.target.value }))} className="h-9" aria-label="Title" />
            <Input value={size} onChange={(e) => setEdits((x) => ({ ...x, size: e.target.value }))} placeholder="Size" className="h-9" aria-label="Size" />
            <Input value={price} onChange={(e) => setEdits((x) => ({ ...x, price: e.target.value }))} placeholder="Price" inputMode="decimal" className="h-9" aria-label="Price" />
          </div>
        ) : (
          <div>
            <p className="font-medium truncate">{item.title}</p>
            <p className="text-sm text-muted flex items-center gap-2 flex-wrap">
              {item.size ? `Size ${item.size} · ` : ""}
              <b className="text-ink font-medium tabular-nums">{money(item.price_cents)}</b>
              {item.ai_status === "pending" && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <IconSpark size={12} /> AI adding details
                </span>
              )}
            </p>
          </div>
        )}
        <RetailHint item={item} />
        {item.memory_hint && <p className="text-xs text-ink-soft">Pricing memory: {item.memory_hint}</p>}
        <div className="flex items-center gap-2">
          <Button onClick={goLive} disabled={busy || !isLive} variant="brand" size="sm">
            {!isLive ? "Go live first" : busy ? "…" : editing ? "Save and put live" : `Live in ${countdown}s · now`}
          </Button>
          {!editing && (
            <Button onClick={() => setManualEdit(true)} variant="secondary" size="sm">
              Fix it
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
