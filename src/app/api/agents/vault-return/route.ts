import { NextResponse, type NextRequest } from "next/server";
import { finishAgentSetup } from "@/lib/agents";
import { getDb } from "@/lib/db";

// PayPal sends the buyer back here after they approve (or cancel) saving PayPal.
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agent") ?? "";
  const row = getDb().prepare("SELECT return_show_id FROM agents WHERE id = ?").get(agentId) as { return_show_id: string | null } | undefined;
  const back = (status: string) =>
    NextResponse.redirect(new URL(row?.return_show_id ? `/live/${row.return_show_id}?agent=${status}` : `/?agent=${status}`, req.url));

  if (!row) return back("error");
  if (req.nextUrl.searchParams.get("cancelled")) {
    getDb().prepare("DELETE FROM agents WHERE id = ? AND status = 'pending'").run(agentId);
    return back("cancelled");
  }
  try {
    await finishAgentSetup(agentId);
    return back("ready");
  } catch (err) {
    console.error("[agents] finishing setup failed", (err as Error).message);
    return back("error");
  }
}
