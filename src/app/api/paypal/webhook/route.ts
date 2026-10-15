import { NextResponse } from "next/server";
import { col } from "@/lib/db";
import { markOrderPaid } from "@/lib/live";
import { verifyWebhook } from "@/lib/paypal";

// PayPal calls this when something happens (payment completed, refund, ...).
// We only act on events whose signature PayPal itself confirms.
export async function POST(req: Request) {
  const raw = await req.text();
  let verified = false;
  try {
    verified = await verifyWebhook(req.headers, raw);
  } catch (err) {
    console.error("[paypal webhook] verification error", (err as Error).message);
  }
  if (!verified) return NextResponse.json({ error: "Signature not verified." }, { status: 400 });

  const event = JSON.parse(raw) as {
    event_type: string;
    resource: { id: string; supplementary_data?: { related_ids?: { order_id?: string } } };
  };

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const paypalOrderId = event.resource.supplementary_data?.related_ids?.order_id;
    if (paypalOrderId) {
      const order = await (await col("orders")).findOne({ paypal_order_id: paypalOrderId }, { projection: { id: 1 } });
      if (order) await markOrderPaid(order.id, event.resource.id);
    }
  }

  return NextResponse.json({ received: true });
}
