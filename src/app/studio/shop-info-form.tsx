"use client";

import { useEffect, useState } from "react";

type Info = { shipping: string; returns: string; sizing: string; other: string };
const FIELDS: { key: keyof Info; label: string; placeholder: string }[] = [
  { key: "shipping", label: "Shipping", placeholder: "We ship to the US and Canada. US shipping takes 3-5 days. Canada shipping is 15 USD, 5-8 days." },
  { key: "returns", label: "Returns", placeholder: "Returns within 14 days if unworn. Buyer pays return shipping. Final sale on auction items." },
  { key: "sizing", label: "Sizing", placeholder: "Medium jackets measure 21 inches pit to pit, 25 inches long. Vintage sizes run small." },
  { key: "other", label: "Anything else", placeholder: "Everything is hand-picked vintage, cleaned and checked. We do bundle deals on 3+ items." },
];

// The shop assistant answers viewers' questions from this (RAG), and names the source.
export default function ShopInfoForm() {
  const [info, setInfo] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/shop", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!active || !b.info) return;
        setInfo(b.info);
        setOpen(!Object.values(b.info).some(Boolean)); // open by default until something is filled in
      });
    return () => {
      active = false;
    };
  }, []);

  if (!info) return null;
  const filled = Object.values(info).filter(Boolean).length;

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-4 space-y-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <div>
          <h2 className="font-bold">🤖 Shop info for your assistant</h2>
          <p className="text-xs text-black/50">
            Viewers&apos; questions in chat are answered from this, with the source shown. If the answer isn&apos;t here, the assistant asks you.
            {filled ? ` (${filled} of 4 filled in)` : ""}
          </p>
        </div>
        <span className="text-black/40">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setNote(null);
            const res = await fetch("/api/shop", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(info) });
            const body = await res.json();
            setBusy(false);
            setNote(
              !res.ok
                ? body.error
                : body.searchable
                  ? `Saved. Your assistant knows ${body.pieces} piece${body.pieces === 1 ? "" : "s"} of shop info.`
                  : "Saved, but the AI couldn't index it right now (free tier busy). Save again in a minute.",
            );
          }}
        >
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="font-semibold">{f.label}</span>
              <textarea
                value={info[f.key]}
                onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                rows={2}
                maxLength={3000}
                className="mt-1 w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </label>
          ))}
          <div className="flex items-center gap-3">
            <button disabled={busy} className="h-10 px-5 rounded-full bg-black text-white text-sm font-semibold disabled:opacity-50">
              {busy ? "Teaching your assistant…" : "Save shop info"}
            </button>
            {note && <p className="text-xs text-black/60">{note}</p>}
          </div>
        </form>
      )}
    </section>
  );
}
