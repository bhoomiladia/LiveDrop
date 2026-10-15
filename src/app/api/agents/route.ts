import { NextResponse, type NextRequest } from "next/server";
import { deleteAgent, getAgentForViewer, normalizeSizes, setAgentPaused, startAgentSetup, weeklySpentCents, type AgentRow } from "@/lib/agents";
import { getShow } from "@/lib/live";
import { PayPalError } from "@/lib/paypal";
import { getViewer } from "@/lib/viewer";

async function publicAgent(a: AgentRow) {
  return {
    id: a.id,
    wish: a.wish,
    sizes: a.sizes,
    max_item_cents: a.max_item_cents,
    weekly_budget_cents: a.weekly_budget_cents,
    spent_cents: await weeklySpentCents(a.id),
    undo_minutes: a.undo_minutes,
    expires_at: a.expires_at,
    status: a.status,
    email: a.email ? a.email.replace(/^(.).*(@.*)$/, "$1•••$2") : null,
  };
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ agent: null });
  const agent = await getAgentForViewer(viewer.id);
  return NextResponse.json({ agent: agent && agent.status !== "pending" ? await publicAgent(agent) : null });
}

// Create an agent and get the PayPal link where the buyer approves saving PayPal.
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in with a buyer account first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const wish = typeof body.wish === "string" ? body.wish.trim().slice(0, 200) : "";
  if (wish.length < 3) return NextResponse.json({ error: "Tell your agent what to look for." }, { status: 400 });
  const maxItem = Number(body.maxItemUsd);
  const weekly = Number(body.weeklyBudgetUsd);
  const undoMinutes = Number(body.undoMinutes ?? 30);
  if (!Number.isFinite(maxItem) || maxItem < 1 || maxItem > 2000) return NextResponse.json({ error: "Max per item: 1 to 2,000 USD." }, { status: 400 });
  if (!Number.isFinite(weekly) || weekly < maxItem || weekly > 5000) {
    return NextResponse.json({ error: "Weekly budget must be at least the max per item (and at most 5,000 USD)." }, { status: 400 });
  }
  if (![1, 5, 15, 30, 60].includes(undoMinutes)) return NextResponse.json({ error: "Pick an undo window." }, { status: 400 });
  const email = typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email.trim()) ? body.email.trim().toLowerCase() : null;
  const returnShowId = typeof body.showId === "string" && (await getShow(body.showId)) ? body.showId : null;

  try {
    const { approveUrl } = await startAgentSetup({
      viewer,
      email,
      wish,
      sizes: typeof body.sizes === "string" ? normalizeSizes(body.sizes) : null,
      maxItemCents: Math.round(maxItem * 100),
      weeklyBudgetCents: Math.round(weekly * 100),
      undoMinutes,
      days: 30,
      returnShowId,
      origin: req.nextUrl.origin,
    });
    return NextResponse.json({ approveUrl });
  } catch (err) {
    const msg = err instanceof PayPalError ? `PayPal: ${err.message}` : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// Pause or resume.
export async function PATCH(req: NextRequest) {
  const viewer = await getViewer();
  const agent = viewer && (await getAgentForViewer(viewer.id));
  if (!agent || agent.status === "pending") return NextResponse.json({ error: "No agent." }, { status: 404 });
  const { paused } = await req.json().catch(() => ({}));
  await setAgentPaused(agent, Boolean(paused));
  return NextResponse.json({ agent: await publicAgent((await getAgentForViewer(viewer.id))!) });
}

// Delete the agent and its saved PayPal.
export async function DELETE() {
  const viewer = await getViewer();
  const agent = viewer && (await getAgentForViewer(viewer.id));
  if (!agent) return NextResponse.json({ ok: true });
  await deleteAgent(agent);
  return NextResponse.json({ ok: true });
}
