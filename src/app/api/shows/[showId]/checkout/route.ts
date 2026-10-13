import { NextResponse, type NextRequest } from "next/server";
import { completeCheckout, startCheckout } from "@/lib/live";
import { PayPalError } from "@/lib/paypal";
import { getViewer } from "@/lib/viewer";

function errorResponse(err: unknown) {
  if (err instanceof PayPalError) {
    console.error("[paypal]", err.status, err.name, err.message);
    return NextResponse.json({ error: `PayPal: ${err.message}` }, { status: 502 });
  }
  return NextResponse.json({ error: (err as Error).message || "Checkout failed." }, { status: 400 });
}

// Step 1: create a PayPal order for everything in the viewer's bag.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/checkout">) {
  const { showId } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Pick a name first." }, { status: 401 });
  try {
    return NextResponse.json(await startCheckout(showId, viewer));
  } catch (err) {
    return errorResponse(err);
  }
}

// Step 2: the buyer approved in the PayPal window — capture the payment.
export async function PUT(req: NextRequest, _ctx: RouteContext<"/api/shows/[showId]/checkout">) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Pick a name first." }, { status: 401 });
  const { paypalOrderId } = await req.json().catch(() => ({}));
  if (typeof paypalOrderId !== "string") return NextResponse.json({ error: "Missing order." }, { status: 400 });
  try {
    const order = await completeCheckout(paypalOrderId, viewer.id);
    return NextResponse.json({ ok: true, status: order.status });
  } catch (err) {
    return errorResponse(err);
  }
}
