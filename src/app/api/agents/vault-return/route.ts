import { NextResponse, type NextRequest } from "next/server";
import { finishAgentSetup } from "@/lib/agents";
import { col } from "@/lib/db";

// PayPal sends the buyer back here after they approve (or cancel) saving PayPal.
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agent") ?? "";
  const agents = await col("agents");
  const row = await agents.findOne({ id: agentId }, { projection: { return_show_id: 1 } });
  const back = (status: string) =>
    NextResponse.redirect(new URL(row?.return_show_id ? `/live/${row.return_show_id}?agent=${status}` : `/dashboard/agent?agent=${status}`, req.url));

  if (!row) return back("error");
  if (req.nextUrl.searchParams.get("cancelled")) {
    await agents.deleteOne({ id: agentId, status: "pending" });
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
