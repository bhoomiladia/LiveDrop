import { NextResponse, type NextRequest } from "next/server";
import { refundOrder } from "@/lib/aftershow";
import { PayPalError } from "@/lib/paypal";
import { requireSeller } from "@/lib/viewer";

// Refund one item (itemId) or the whole order through PayPal.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/orders/[orderId]/refund">) {
  const { showId, orderId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can refund." }, { status: 403 });
  const { itemId } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await refundOrder(showId, orderId, typeof itemId === "string" ? itemId : null));
  } catch (err) {
    const msg = err instanceof PayPalError ? `PayPal: ${err.message}` : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
