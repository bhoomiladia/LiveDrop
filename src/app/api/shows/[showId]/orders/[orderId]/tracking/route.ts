import { NextResponse, type NextRequest } from "next/server";
import { setTracking } from "@/lib/aftershow";
import { PayPalError } from "@/lib/paypal";
import { requireSeller } from "@/lib/viewer";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/orders/[orderId]/tracking">) {
  const { showId, orderId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can add tracking." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const carrier = typeof body.carrier === "string" ? body.carrier.trim().slice(0, 40) : "";
  const number = typeof body.trackingNumber === "string" ? body.trackingNumber.replace(/\s/g, "").toUpperCase().slice(0, 40) : "";
  if (!carrier || !/^[A-Z0-9-]{6,40}$/.test(number)) return NextResponse.json({ error: "Enter a carrier and a valid tracking number." }, { status: 400 });
  try {
    return NextResponse.json(await setTracking(showId, orderId, carrier, number));
  } catch (err) {
    const msg = err instanceof PayPalError ? `PayPal: ${err.message}` : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
