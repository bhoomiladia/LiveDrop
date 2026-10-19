"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@/components/ui/icons";
import { Button, Card, Field, Input, Notice, Select, typeDemo } from "@/components/ui/kit";

// Starts a new show. Shipping and pay window come from the seller's profile defaults.
export default function NewShowForm({ defaultShippingCents, defaultClaimMinutes }: { defaultShippingCents: number; defaultClaimMinutes: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shipping, setShipping] = useState(String(defaultShippingCents / 100));
  const [claimMinutes, setClaimMinutes] = useState(String(defaultClaimMinutes));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card id="new" className="p-5 scroll-mt-24">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Start a new show</h2>
      <p className="text-[13px] text-muted mt-1">You can turn on your camera and go live from the studio when you&apos;re ready.</p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          const res = await fetch("/api/shows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, shippingUsd: Number(shipping), claimMinutes: Number(claimMinutes) }),
          });
          const body = await res.json();
          if (!res.ok) {
            setBusy(false);
            return setErr(body.error);
          }
          router.push(`/studio/${body.show.id}`);
        }}
      >
        <Field label="Show title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onClick={() => !title && typeDemo("Friday Vintage Drop", setTitle)}
            placeholder="Friday vintage denim drop"
            required
            minLength={3}
            maxLength={80}
          />
        </Field>
        <Field label="Shipping (USD)">
          <Input value={shipping} onChange={(e) => setShipping(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Time to pay">
          <Select value={claimMinutes} onChange={(e) => setClaimMinutes(e.target.value)} title="Unpaid claims pass to the next person in line after this">
            {[1, 2, 3, 5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m} minute{m === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
        <Button disabled={busy || title.trim().length < 3}>
          {busy ? "Creating…" : "Create show"} {!busy && <IconArrowRight size={15} />}
        </Button>
      </form>
      {err && <Notice tone="error" className="mt-4">{err}</Notice>}
    </Card>
  );
}
