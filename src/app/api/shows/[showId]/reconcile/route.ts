import { NextResponse, type NextRequest } from "next/server";
import { PayPalError } from "@/lib/paypal";
import { reconcileShow } from "@/lib/reconcile";
import { requireSeller } from "@/lib/viewer";

// Check this show's sales against PayPal's Transaction Search, with fees and net.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/reconcile">) {
  const { showId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can do that." }, { status: 403 });
  try {
    return NextResponse.json(await reconcileShow(showId));
  } catch (err) {
    const msg = err instanceof PayPalError ? `PayPal: ${err.message}` : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
