"use client";

import { createAiHarness, directLlmRunner, type AgAiHarnessSetup, type AgAiPromptStarter, type AgAiTool, type AgBuiltInAgentId } from "ag-studio";
import { geminiAdapter } from "./gemini-adapter";

// The Show Producer: AG Studio's agent framework, running on Gemini through our adapter.
// AG's built-in agents build charts and query the data; we rename the lead agent and give it
// Live Drop + PayPal tools. Anything that moves money asks the seller first (a real confirm dialog).

type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<string>;
  confirm?: (args: Record<string, unknown>) => string;
};

function tool(def: ToolDef): AgAiTool {
  return {
    name: def.name,
    description: def.description,
    kind: "client",
    schema: () => ({ name: def.name, description: def.description, parameters: def.parameters as never, kind: "client" }),
    async execute(call, ctx) {
      try {
        if (def.confirm && !window.confirm(def.confirm(call.args))) {
          return ctx.success("The seller declined, so nothing was done. Don't retry unless they ask.");
        }
        return ctx.success(await def.run(call.args));
      } catch (err) {
        return ctx.error((err as Error).message || "That didn't work.");
      }
    },
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const noArgs = { type: "object", properties: {}, additionalProperties: false };

export function liveDropTools(showId: string, onChanged: () => void): AgAiTool[] {
  return [
    tool({
      name: "live_drop_show_status",
      description:
        "Live, up-to-the-second status of THIS show: whether it's live, unpaid claims, open PayPal invoices, and every paid order with its order id and item ids " +
        "(needed for refunds). Use it before any action. The dashboard data may be a few minutes old; this is not.",
      parameters: noArgs,
      run: async () => {
        type Snap = { show: { title: string; status: string }; items: { id: string; title: string; status: string; price_cents: number; winner_name: string | null }[] };
        type Orders = {
          orders: { id: string; viewer_name: string; kind: string; status: string; item_cents: number; shipping_cents: number; refunded_cents: number; tracking_number: string | null; items: { id: string; title: string; price_cents: number; status: string }[] }[];
          open_invoices: { viewer_name: string; total_cents: number }[];
          unpaid_without_invoice: number;
        };
        const [snap, o] = await Promise.all([api<Snap>(`/api/shows/${showId}`), api<Orders>(`/api/shows/${showId}/orders`)]);
        const unpaid = snap.items.filter((i) => i.status === "claimed");
        return JSON.stringify({
          show: snap.show,
          unpaid_claims: unpaid.map((i) => ({ item: i.title, buyer: i.winner_name, price: money(i.price_cents / 100) })),
          open_invoices: o.open_invoices.map((v) => ({ buyer: v.viewer_name, total: money(v.total_cents / 100) })),
          orders: o.orders.map((x) => ({
            order_id: x.id,
            buyer: x.viewer_name,
            paid_via: x.kind,
            status: x.status,
            total: money((x.item_cents + x.shipping_cents) / 100),
            refunded: money(x.refunded_cents / 100),
            shipped: Boolean(x.tracking_number),
            items: x.items.map((i) => ({ item_id: i.id, title: i.title, price: money(i.price_cents / 100), status: i.status })),
          })),
        });
      },
    }),
    tool({
      name: "live_drop_send_invoices",
      description: "Send one PayPal invoice (with a QR code) to every buyer who claimed items but hasn't paid. Moves money: the seller must approve.",
      parameters: noArgs,
      confirm: () => "Show Producer wants to send PayPal invoices to everyone with unpaid items. Send them?",
      run: async () => {
        const r = await api<{ sent: number; failed: number }>(`/api/shows/${showId}/invoices`, { method: "POST" });
        onChanged();
        return `Sent ${r.sent} PayPal invoice(s)${r.failed ? `, ${r.failed} failed` : ""}.`;
      },
    }),
    tool({
      name: "live_drop_release_unpaid",
      description: "Take every unpaid claim away from its buyer now and give the item to the next person in line (or reopen it). The seller must approve.",
      parameters: noArgs,
      confirm: () => "Show Producer wants to release every unpaid claim to the next person in line. Go ahead?",
      run: async () => {
        const r = await api<{ released: number }>(`/api/shows/${showId}/release`, { method: "POST" });
        onChanged();
        return `Released ${r.released} unpaid claim(s).`;
      },
    }),
    tool({
      name: "live_drop_refund",
      description:
        "Refund a paid order through PayPal: one item (give item_id) or everything left in the order (omit item_id). Get ids from live_drop_show_status. The seller must approve.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "order_id from live_drop_show_status" },
          item_id: { type: "string", description: "Optional: refund only this item" },
          reason: { type: "string", description: "Short reason, shown to the seller" },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
      confirm: (a) => `Show Producer wants to refund ${a.item_id ? "one item of" : "everything left in"} order ${String(a.order_id).slice(0, 8)}${a.reason ? ` (${a.reason})` : ""} through PayPal. Refund?`,
      run: async (a) => {
        const r = await api<{ amount_cents: number }>(`/api/shows/${showId}/orders/${encodeURIComponent(String(a.order_id))}/refund`, {
          method: "POST",
          body: JSON.stringify({ itemId: a.item_id ?? null }),
        });
        onChanged();
        return `Refunded ${money(r.amount_cents / 100)} through PayPal.`;
      },
    }),
    tool({
      name: "paypal_reconcile",
      description: "Check this show's sales against PayPal's own records (Transaction Search). Returns gross, PayPal fees, net, and any sale PayPal doesn't list yet.",
      parameters: noArgs,
      run: async () => JSON.stringify(await api(`/api/shows/${showId}/reconcile`)),
    }),
  ];
}

const PROMPT_STARTERS: AgAiPromptStarter[] = [
  { label: "What sold fastest?", prompt: "Which items got claimed fastest, and what do they have in common? Add a chart." },
  { label: "Plan my next show", prompt: "Based on what sold and what didn't, what should I bring to my next show? Add a chart that supports your advice." },
  { label: "Who hasn't paid?", prompt: "Who hasn't paid yet in this show, and what do you suggest?" },
  { label: "Check with PayPal", prompt: "Reconcile this show with PayPal. What were the fees and what's my net?" },
];

const PRODUCER_INTRO = `You are the Show Producer for a seller on Live Drop, a live-video shopping app that runs on PayPal.
You help the seller understand their shows and you can act on PayPal for them.
- For charts and analysis, use the dashboard data and your Studio tools. Prefer adding a chart when it helps.
- Never guess. Before giving advice, query the data (schema + queries) and quote real numbers, item names and categories.
  Only use fields that exist in the schema; if something isn't in the data (e.g. a field you'd like), say so plainly.
- The data is small (one seller). If there are only a few sales, say that the sample is small.
- For anything about the current show's unpaid claims, invoices, orders or refunds, call live_drop_show_status first: it is live.
- Tools that move money (invoices, releasing claims, refunds) show the seller a confirmation. Only use them when the seller asked for that outcome.
- Be brief and concrete. Money is USD, in the PayPal sandbox.`;

export function buildShowProducer(showId: string, onChanged: () => void): AgAiHarnessSetup {
  const adapter = geminiAdapter();
  const extra = liveDropTools(showId, onChanged);
  return ({ api }) =>
    createAiHarness(api, ({ builtIn }) => {
      const lead = builtIn.lead;
      const producer = directLlmRunner({
        ...lead,
        name: "Show Producer",
        description: "Your AI producer: analyses your shows, builds charts, and handles PayPal follow-ups with your approval.",
        adapter,
        instructions: (ctx, params) => `${PRODUCER_INTRO}\n\n${lead.instructions?.(ctx, params) ?? ""}`,
        tools: (ctx, params) => [...(lead.tools?.(ctx, params) ?? []), ...extra],
      });
      const helpers = (["data", "page", "planning", "widget"] as AgBuiltInAgentId[]).map((id) => directLlmRunner({ ...builtIn[id], adapter }));
      return { agents: [producer, ...helpers], primary: producer.id, promptStarters: PROMPT_STARTERS };
    });
}
