"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardHeader, Field, Notice, Textarea } from "@/components/ui/kit";
import { DEMO } from "@/lib/demo-script";

type Info = { shipping: string; returns: string; sizing: string; other: string };
const FIELDS: { key: keyof Info; label: string; placeholder: string }[] = [
  { key: "shipping", label: "Shipping", placeholder: "We ship to the US and Canada. US shipping takes 3-5 days. Canada shipping is 15 USD, 5-8 days." },
  { key: "returns", label: "Returns", placeholder: "Returns within 14 days if unworn. Buyer pays return shipping. Final sale on auction items." },
  { key: "sizing", label: "Sizing", placeholder: "Medium jackets measure 21 inches pit to pit, 25 inches long. Vintage sizes run small." },
  { key: "other", label: "Anything else", placeholder: "Everything is hand-picked vintage, cleaned and checked. We do bundle deals on 3+ items." },
];

// The shop assistant answers viewers' questions from this (RAG), and names the source.
// `bare` renders just the fields (for onboarding); `onSaved` runs after a successful save.
export default function ShopInfoForm({ bare, onSaved, submitLabel }: { bare?: boolean; onSaved?: () => void; submitLabel?: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error" | "neutral"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/shop", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => active && b.info && setInfo(b.info));
    return () => {
      active = false;
    };
  }, []);

  if (!info) return bare ? null : <Card className="h-64 animate-pulse" />;
  const filled = Object.values(info).filter(Boolean).length;

  const form = (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNote(null);
        const res = await fetch("/api/shop", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(info) });
        const body = await res.json();
        setBusy(false);
        if (!res.ok) return setNote({ tone: "error", text: body.error });
        setNote(
          body.searchable
            ? { tone: "success", text: `Saved. Your assistant knows ${body.pieces} piece${body.pieces === 1 ? "" : "s"} of shop info.` }
            : { tone: "neutral", text: "Saved, but the AI couldn't index it right now (free tier busy). Save again in a minute." },
        );
        onSaved?.();
      }}
    >
      {FIELDS.map((f) => (
        <Field key={f.key} label={f.label}>
          <Textarea
            value={info[f.key]}
            onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            rows={3}
            maxLength={3000}
            demo={DEMO.shopInfo[f.key]}
          />
        </Field>
      ))}
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <Button disabled={busy}>{busy ? "Teaching your assistant…" : (submitLabel ?? "Save shop info")}</Button>
    </form>
  );

  if (bare) return form;
  return (
    <Card id="shop-info" className="scroll-mt-24">
      <CardHeader
        title="Shop info for your assistant"
        description={`Viewers' questions in chat are answered from this, with the source shown. If the answer isn't here, the assistant asks you. ${filled} of 4 filled in.`}
      />
      <div className="px-5 pb-5">{form}</div>
    </Card>
  );
}
