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
      `<body style="font-family:system-ui;max-width:420px;margin:15vh auto;padding:0 16px;text-align:center">` +
      `<h1>🔴 Live Drop</h1><p>${message.replace(/</g, "&lt;")}</p><p><a href="/">Back to Live Drop</a></p></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
