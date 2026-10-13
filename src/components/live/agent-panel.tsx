"use client";

import { useEffect, useState } from "react";
import { money } from "./use-show";

type Agent = {
  id: string;
  wish: string;
  sizes: string | null;
  max_item_cents: number;
  weekly_budget_cents: number;
  spent_cents: number;
  undo_minutes: number;
  expires_at: number;
  status: "active" | "paused";
  email: string | null;
};

// "Send your agent": set it up once, it shops live shows for you within your limits.
export default function AgentPanel({ showId, onToast }: { showId: string; onToast: (m: string) => void }) {
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ wish: "", sizes: "", maxItemUsd: "60", weeklyBudgetUsd: "150", undoMinutes: "30", email: "" });

  useEffect(() => {
    let active = true;
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => active && setAgent(b.agent));
    // Coming back from PayPal after saving PayPal for the agent.
    const result = new URLSearchParams(window.location.search).get("agent");
    if (result) {
      const messages: Record<string, string> = {
        ready: "🤖 Your agent is active and watching live shows.",
        cancelled: "Agent setup cancelled. Nothing was saved.",
        error: "Couldn't finish setting up the agent. Please try again.",
      };
      if (messages[result]) onToast(messages[result]);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setPaused(paused: boolean) {
    const res = await fetch("/api/agents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused }) });
    const body = await res.json();
    if (res.ok) setAgent(body.agent);
  }

  async function remove() {
    if (!confirm("Delete your agent? Its saved PayPal is deleted too.")) return;
    await fetch("/api/agents", { method: "DELETE" });
    setAgent(null);
    onToast("Agent deleted. Saved PayPal removed.");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, maxItemUsd: Number(form.maxItemUsd), weeklyBudgetUsd: Number(form.weeklyBudgetUsd), undoMinutes: Number(form.undoMinutes), showId }),
    });
    const body = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setErr(body.error);
    }
    // PayPal asks the buyer to approve saving PayPal, then sends them back here.
    window.location.href = body.approveUrl;
  }

  if (agent === undefined) return null;

  if (agent) {
    const left = Math.max(0, agent.weekly_budget_cents - agent.spent_cents);
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">🤖 Your agent is {agent.status === "active" ? "shopping" : "paused"}</h2>
          <span className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-300 animate-pulse" : "bg-white/40"}`} />
        </div>
        <p className="text-sm text-white/90">“{agent.wish}”</p>
        <p className="text-xs text-white/70">
          {agent.sizes ? `Sizes ${agent.sizes.replaceAll(",", ", ")} · ` : ""}up to {money(agent.max_item_cents)} each · {money(left)} of {money(agent.weekly_budget_cents)} left this week ·{" "}
          {agent.undo_minutes} min to undo
        </p>
        <p className="text-[11px] text-white/60">Limits are signed and checked by code before every purchase. People watching always get a few seconds head start.</p>
        <div className="flex gap-2 pt-1">
          <button onClick={() => setPaused(agent.status === "active")} className="h-8 px-3 rounded-full bg-white/15 text-xs font-semibold">
            {agent.status === "active" ? "Pause" : "Resume"}
          </button>
          <button onClick={remove} className="h-8 px-3 rounded-full bg-white/15 text-xs font-semibold">
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-4 text-left">
        <p className="font-bold">🤖 Send your AI agent</p>
        <p className="text-sm text-white/80">Tell it what you want and your limits. It buys matching items in live shows while you sleep, with an undo button.</p>
      </button>
    );
  }

  const field = "w-full h-9 rounded-lg bg-white/10 px-3 text-sm placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/40";
  return (
    <form onSubmit={create} className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-4 space-y-2.5">
      <h2 className="font-bold">🤖 Set up your agent</h2>
      <label className="block text-xs text-white/80">
        What should it look for?
        <input required className={field} placeholder="Vintage denim jacket, no rips" value={form.wish} onChange={(e) => setForm({ ...form, wish: e.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-white/80">
          Sizes
          <input className={field} placeholder="M, L" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
        </label>
        <label className="text-xs text-white/80">
          Max each $
          <input className={field} inputMode="decimal" value={form.maxItemUsd} onChange={(e) => setForm({ ...form, maxItemUsd: e.target.value })} />
        </label>
        <label className="text-xs text-white/80">
          Per week $
          <input className={field} inputMode="decimal" value={form.weeklyBudgetUsd} onChange={(e) => setForm({ ...form, weeklyBudgetUsd: e.target.value })} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-white/80">
          Undo window
          <select className={`${field} bg-indigo-700`} value={form.undoMinutes} onChange={(e) => setForm({ ...form, undoMinutes: e.target.value })}>
            {[1, 5, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/80">
          Email (for undo link)
          <input className={field} type="email" placeholder="optional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
      </div>
      {err && <p className="text-xs text-amber-200">{err}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="flex-1 h-10 rounded-full bg-[#ffc439] text-black font-semibold text-sm disabled:opacity-60">
          {busy ? "Opening PayPal…" : "Save PayPal & activate"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 rounded-full bg-white/15 text-sm">
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-white/60">
        You approve saving PayPal once (sandbox, test money). Each purchase is held, not charged, until the undo window ends.
      </p>
    </form>
  );
}
