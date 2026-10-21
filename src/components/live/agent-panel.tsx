"use client";

import { useEffect, useState } from "react";
import { IconAgent, IconShield } from "@/components/ui/icons";
import { Badge, Button, Card, Field, Input, Notice, Select, money } from "@/components/ui/kit";
import { DEMO, demoMode } from "@/lib/demo-script";

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
// In a show (`showId`) it's a compact sidebar card; on the dashboard it's the full page panel.
export default function AgentPanel({
  showId,
  onToast,
  defaults,
  full,
}: {
  showId?: string;
  onToast: (m: string) => void;
  defaults?: { wish?: string; sizes?: string; email?: string };
  full?: boolean;
}) {
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);
  const [open, setOpen] = useState(Boolean(full));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    wish: defaults?.wish ?? "",
    sizes: defaults?.sizes ?? "",
    maxItemUsd: "60",
    weeklyBudgetUsd: "150",
    undoMinutes: demoMode ? "1" : "30", // demo video: the held payment completes while the camera is still rolling
    email: defaults?.email ?? "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => active && setAgent(b.agent));
    // Coming back from PayPal after saving PayPal for the agent.
    const result = new URLSearchParams(window.location.search).get("agent");
    if (result) {
      const messages: Record<string, string> = {
        ready: "Your agent is active and watching live shows.",
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
    setOpen(Boolean(full));
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

  if (agent === undefined) return full ? <Card className="h-72 animate-pulse" /> : null;

  if (agent) {
    const left = Math.max(0, agent.weekly_budget_cents - agent.spent_cents);
    const used = agent.weekly_budget_cents ? Math.min(100, (agent.spent_cents / agent.weekly_budget_cents) * 100) : 0;
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="text-brand">
              <IconAgent size={18} />
            </span>
            Your AI agent
          </h2>
          <Badge tone={agent.status === "active" ? "success" : "neutral"}>{agent.status === "active" ? "Shopping" : "Paused"}</Badge>
        </div>
        <p className="text-sm">&ldquo;{agent.wish}&rdquo;</p>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Sizes</dt>
            <dd className="font-medium">{agent.sizes ? agent.sizes.replaceAll(",", ", ") : "Any"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Max each</dt>
            <dd className="font-medium tabular-nums">{money(agent.max_item_cents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Undo window</dt>
            <dd className="font-medium">{agent.undo_minutes} min</dd>
          </div>
        </dl>
        <div>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>{money(agent.spent_cents)} spent this week</span>
            <span>{money(left)} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-canvas shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
            <div className="h-full bg-brand" style={{ width: `${used}%` }} />
          </div>
        </div>
        {full && (
          <p className="text-xs text-muted flex gap-2 leading-relaxed">
            <IconShield size={16} className="shrink-0 text-success" />
            Limits are signed and checked by code before every purchase, never by the AI alone. People watching always get a few seconds head start.
            Active until {new Date(agent.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => setPaused(agent.status === "active")} variant="secondary" size="sm">
            {agent.status === "active" ? "Pause" : "Resume"}
          </Button>
          <Button onClick={remove} variant="danger" size="sm">
            Delete
          </Button>
        </div>
      </Card>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full text-left bg-paper rounded-[10px] border border-line p-5 hover:border-line-strong transition-colors">
        <p className="text-[15px] font-semibold flex items-center gap-2">
          <span className="text-brand">
            <IconAgent size={18} />
          </span>
          Send your AI agent
        </p>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
          Tell it what you want and your limits. It buys matching items in live shows while you&apos;re away, with an undo button.
        </p>
      </button>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={create} className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold flex items-center gap-2">
            <span className="text-brand">
              <IconAgent size={18} />
            </span>
            Set up your agent
          </h2>
          <p className="text-[13px] text-muted mt-1">It only buys within the limits you set here.</p>
        </div>
        <Field label="What should it look for?">
          <Input required placeholder="Vintage denim jacket, no rips" value={form.wish} onChange={(e) => setForm({ ...form, wish: e.target.value })} demo={DEMO.agentWish} />
        </Field>
        <div className={full ? "grid gap-4 sm:grid-cols-3" : "grid grid-cols-3 gap-3"}>
          <Field label="Sizes">
            <Input placeholder="M, L" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
          </Field>
          <Field label="Max each ($)">
            <Input inputMode="decimal" value={form.maxItemUsd} onChange={(e) => setForm({ ...form, maxItemUsd: e.target.value })} />
          </Field>
          <Field label="Per week ($)">
            <Input inputMode="decimal" value={form.weeklyBudgetUsd} onChange={(e) => setForm({ ...form, weeklyBudgetUsd: e.target.value })} />
          </Field>
        </div>
        <div className={full ? "grid gap-4 sm:grid-cols-2" : "grid grid-cols-2 gap-3"}>
          <Field label="Undo window">
            <Select value={form.undoMinutes} onChange={(e) => setForm({ ...form, undoMinutes: e.target.value })}>
              {[1, 5, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Email for undo link">
            <Input type="email" placeholder="optional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        <div className="flex gap-2">
          <Button disabled={busy} variant="paypal" className="flex-1">
            {busy ? "Opening PayPal…" : "Save PayPal and activate"}
          </Button>
          {!full && (
            <Button type="button" onClick={() => setOpen(false)} variant="ghost">
              Cancel
            </Button>
          )}
        </div>
        <p className="text-xs text-muted leading-relaxed">
          You approve saving PayPal once (sandbox, test money). Each purchase is held, not charged, until the undo window ends.
        </p>
      </form>
    </Card>
  );
}
