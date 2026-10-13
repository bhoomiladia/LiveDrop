"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewShowForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shipping, setShipping] = useState("7");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col sm:flex-row gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch("/api/shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, shippingUsd: Number(shipping) }),
        });
        const body = await res.json();
        setBusy(false);
        if (!res.ok) return setErr(body.error);
        router.push(`/studio/${body.show.id}`);
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Show title, e.g. Friday vintage denim drop"
        className="flex-1 h-11 rounded-xl border border-black/10 px-3 outline-none focus:ring-2 focus:ring-black/10"
      />
      <label className="flex items-center gap-2 text-sm text-black/60">
        Shipping $
        <input
          value={shipping}
          onChange={(e) => setShipping(e.target.value)}
          inputMode="decimal"
          className="w-16 h-11 rounded-xl border border-black/10 px-2 outline-none focus:ring-2 focus:ring-black/10"
        />
      </label>
      <button disabled={busy} className="h-11 px-5 rounded-full bg-black text-white font-semibold disabled:opacity-50">
        {busy ? "Creating…" : "Create show"}
      </button>
      {err && <p className="text-sm text-red-600 sm:basis-full">{err}</p>}
    </form>
  );
}
