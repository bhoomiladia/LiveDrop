"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money, useShow, type LiveItem } from "@/components/live/use-show";

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
  const { snap, setSnap, error, connected, viewers, toasts, pushToast } = useShow(showId);

  // ---- camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
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

  // ---- listing
  const [typed, setTyped] = useState("");
  const [listing, setListing] = useState(false);

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

  if (error) return <div className="p-10 text-center">{error}</div>;
  if (!snap) return <div className="p-10 text-center">Opening the studio…</div>;

  const isLive = snap.show.status === "live";
  const viewerUrl = typeof window !== "undefined" ? `${window.location.origin}/live/${showId}` : `/live/${showId}`;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#0b0d12]">
      <header className="h-14 px-4 md:px-6 flex items-center justify-between bg-white border-b border-black/5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/studio" className="font-extrabold shrink-0">🔴 Live Drop</Link>
          <span className="text-black/50 truncate text-sm">{snap.show.title}</span>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-400"}`} />
          <span className="text-black/50 hidden sm:inline">👀 {Math.max(0, viewers - 1)} watching</span>
          <button
            onClick={() => navigator.clipboard.writeText(viewerUrl).then(() => pushToast("Viewer link copied", "info"))}
            className="h-9 px-3 rounded-full border border-black/10"
          >
            Copy viewer link
          </button>
          {snap.show.status === "scheduled" && (
            <button onClick={() => setStatus("live")} className="h-9 px-4 rounded-full bg-red-600 text-white font-bold">Go live</button>
          )}
          {isLive && (
            <button onClick={() => confirm("End the show?") && setStatus("ended")} className="h-9 px-4 rounded-full bg-black text-white font-semibold">
              End show
            </button>
          )}
          {snap.show.status === "ended" && <span className="px-3 py-1 rounded-full bg-black/5">Ended</span>}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid gap-4 xl:grid-cols-[1.2fr_1fr_320px]">
        {/* Camera + voice */}
        <section className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 grid place-items-center text-center p-6">
                <div>
                  <button onClick={startCamera} className="h-11 px-5 rounded-full bg-white text-black font-semibold">Turn on camera</button>
                  {cameraError && <p className="text-white/70 text-sm mt-3 max-w-xs">{cameraError}</p>}
                </div>
              </div>
            )}
            {isLive && <span className="absolute top-3 left-3 text-xs font-bold bg-red-600 text-white rounded px-2 py-0.5">LIVE</span>}
            {(heard || interim) && (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 text-white text-sm p-2.5">
                {heard} <span className="text-white/50">{interim}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              {speechSupported ? (
                <button
                  onClick={listening ? stopListening : startListening}
                  className={`h-11 px-4 rounded-full font-semibold ${listening ? "bg-red-50 text-red-600 border border-red-200" : "bg-black text-white"}`}
                >
                  {listening ? "🎙️ Listening… (tap to stop)" : "🎙️ Start talking"}
                </button>
              ) : (
                <span className="text-sm text-black/50">Voice needs Chrome. Type below instead.</span>
              )}
              <button
                onClick={() => listIt(heard || interim)}
                disabled={listing || !(heard || interim)}
                className="h-11 px-5 rounded-full bg-amber-400 font-bold disabled:opacity-40"
              >
                {listing ? "Listing…" : "List it"}
              </button>
            </div>
            <p className="text-xs text-black/50">
              Hold the item up and say what it is, the size and the price, e.g. “vintage denim jacket, size medium, forty-five dollars”. Then tap <b>List it</b>.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void listIt(typed);
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="…or type it: wool scarf, forty dollars"
                className="flex-1 min-w-0 h-10 rounded-xl border border-black/10 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
              <button disabled={!typed.trim() || listing} className="h-10 px-4 rounded-full border border-black/10 text-sm font-semibold disabled:opacity-40">
                List
              </button>
            </form>
          </div>
        </section>

        {/* Drafts + listed items */}
        <section className="space-y-3">
          {drafts.map((d) => (
            <DraftCard key={d.id} showId={showId} item={d} isLive={isLive} onError={(m) => pushToast(m, "info")} />
          ))}

          <div className="grid grid-cols-4 gap-2">
            <Stat label="Listed" value={stats.listed} />
            <Stat label="Claimed" value={stats.claimed} />
            <Stat label="Paid" value={stats.paid} />
            <Stat label="Revenue" value={money(stats.revenue)} />
          </div>

          <ul className="space-y-2">
            {listed.map((i) => (
              <li key={i.id} className="bg-white rounded-2xl border border-black/5 p-3 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-xl bg-black/5 overflow-hidden shrink-0">
                  {i.image_data && <img src={i.image_data} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    #{i.seq} {i.title} {i.size && <span className="text-black/50 font-normal">· {i.size}</span>}
                  </p>
                  <p className="text-xs text-black/50">{money(i.price_cents)}</p>
                </div>
                <StatusPill item={i} />
              </li>
            ))}
            {listed.length === 0 && <li className="text-sm text-black/50 p-2">Items you put live appear here.</li>}
          </ul>
        </section>

        {/* Chat */}
        <aside className="bg-white rounded-2xl border border-black/5 flex flex-col h-[600px]">
          <h2 className="font-semibold px-4 pt-3 pb-2 border-b border-black/5">Chat</h2>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
            {snap.messages.map((m) => (
              <div key={m.id}>
                <span className="font-semibold">{m.name}</span>{" "}
                <span className={m.kind === "claim" ? "text-amber-600 font-semibold" : m.kind === "question" ? "text-blue-600" : ""}>{m.text}</span>
                {m.kind !== "other" && m.kind !== "pending" && <span className="ml-1 text-[10px] uppercase text-black/40">{m.kind}</span>}
                {m.kind === "pending" && <span className="ml-1 text-[10px] text-black/40">AI checking…</span>}
              </div>
            ))}
            {snap.messages.length === 0 && <p className="text-black/40 text-center mt-8">No messages yet.</p>}
          </div>
        </aside>
      </main>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2 z-50 w-[min(92vw,420px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg text-center ${
              t.tone === "paid" ? "bg-emerald-500 text-white" : t.tone === "claim" ? "bg-amber-400 text-black" : "bg-black text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-black/40">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  );
}

function StatusPill({ item }: { item: LiveItem }) {
  const map: Record<string, [string, string]> = {
    listed: ["Open", "bg-blue-50 text-blue-700"],
    claimed: [`Claimed · ${item.winner_name}`, "bg-amber-50 text-amber-700"],
    paid: [`Paid · ${item.winner_name}`, "bg-emerald-50 text-emerald-700"],
    shipped: ["Shipped", "bg-emerald-50 text-emerald-700"],
    on_hold: ["Agent hold", "bg-purple-50 text-purple-700"],
    refunded: ["Refunded", "bg-black/5 text-black/60"],
  };
  const [text, cls] = map[item.status] ?? [item.status, "bg-black/5"];
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap max-w-[140px] truncate ${cls}`}>{text}</span>;
}

// A new listing: shows what plain code understood instantly, lets the seller fix it,
// and goes live by itself after a short countdown.
function DraftCard({ showId, item, isLive, onError }: { showId: string; item: LiveItem; isLive: boolean; onError: (m: string) => void }) {
  const [title, setTitle] = useState(item.title);
  const [size, setSize] = useState(item.size ?? "");
  const [price, setPrice] = useState(item.price_cents ? String(item.price_cents / 100) : "");
  const [editing, setEditing] = useState(!item.price_cents);
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
    <div className="bg-white rounded-2xl border-2 border-amber-300 p-3 flex gap-3">
      <div className="w-20 h-20 rounded-xl bg-black/5 overflow-hidden shrink-0">
        {item.image_data ? <img src={item.image_data} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-2xl">🛍️</div>}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {editing ? (
          <div className="grid grid-cols-[1fr_64px_80px] gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg border border-black/10 px-2 text-sm" />
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size" className="h-9 rounded-lg border border-black/10 px-2 text-sm" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" inputMode="decimal" className="h-9 rounded-lg border border-black/10 px-2 text-sm" />
          </div>
        ) : (
          <div>
            <p className="font-semibold truncate">{item.title}</p>
            <p className="text-sm text-black/60">
              {item.size ? `Size ${item.size} · ` : ""}
              <b className="text-black">{money(item.price_cents)}</b>
              {item.ai_status === "pending" && <span className="ml-2 text-xs text-black/40">✨ AI adding details…</span>}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={goLive} disabled={busy || !isLive} className="h-8 px-3 rounded-full bg-red-600 text-white text-xs font-bold disabled:opacity-40">
            {!isLive ? "Go live first" : busy ? "…" : editing ? "Save & put live" : `Live in ${countdown}s · now`}
          </button>
          {!editing && (
            <button
              onClick={() => {
                // Start editing from the latest values (the AI may have improved them).
                setTitle(item.title);
                setSize(item.size ?? "");
                setPrice(item.price_cents ? String(item.price_cents / 100) : "");
                setEditing(true);
              }}
              className="h-8 px-3 rounded-full border border-black/10 text-xs font-semibold">
              Fix it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
