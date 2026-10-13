import { NextResponse, type NextRequest } from "next/server";
import { sendAfterShowInvoices } from "@/lib/aftershow";
import { requireSeller } from "@/lib/viewer";

// Send PayPal invoices now for everything claimed but unpaid (also happens automatically when the show ends).
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/invoices">) {
  const { showId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can do that." }, { status: 403 });
  return NextResponse.json(await sendAfterShowInvoices(showId));
}
