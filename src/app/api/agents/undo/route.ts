import { NextResponse, type NextRequest } from "next/server";
import { undoAgentPurchase } from "@/lib/agents";
import { PayPalError } from "@/lib/paypal";
import { getViewer } from "@/lib/viewer";

// Undo from the live page (the viewer's cookie proves ownership).
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  const { orderId } = await req.json().catch(() => ({}));
  if (!viewer || typeof orderId !== "string") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  try {
    await undoAgentPurchase(orderId, viewer.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof PayPalError ? `PayPal: ${err.message}` : (err as Error).message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// Undo from the email link (a signed token proves ownership).
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order") ?? "";
  const token = req.nextUrl.searchParams.get("t") ?? "";
  let message: string;
  try {
    await undoAgentPurchase(orderId, null, token);
    message = "Done. The purchase is cancelled and the money on hold was released. Nothing was charged.";
  } catch (err) {
    message = (err as Error).message;
  }
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live Drop</title>` +
      `<body style="font-family:'Inter Tight','Helvetica Neue',system-ui,sans-serif;color:#140c09;background:#fbf8f6;max-width:420px;margin:15vh auto;padding:0 16px;text-align:center">` +
      `<p style="font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#d2491c">Live Drop</p>` +
      `<p style="font-size:17px;line-height:1.5">${message.replace(/</g, "&lt;")}</p>` +
      `<p><a href="/dashboard/orders" style="color:#d2491c">Go to your orders</a></p></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
