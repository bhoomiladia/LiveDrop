import { NextResponse, type NextRequest } from "next/server";
import { getShow, postMessage } from "@/lib/live";
import { sellerReply } from "@/lib/rag";
import { getViewer, requireSeller } from "@/lib/viewer";

// Simple per-viewer rate limit so one person can't flood the chat.
const lastMessageAt = new Map<string, number>();

export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/chat">) {
  const { showId } = await ctx.params;

  // The seller can chat too, e.g. answering a question the shop assistant couldn't.
  const seller = await requireSeller(showId);
  if (seller) {
    const { text, replyTo } = await req.json().catch(() => ({}));
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "Empty message." }, { status: 400 });
    const msg = await sellerReply(showId, seller.userId, text.trim(), typeof replyTo === "string" ? replyTo : null);
    return NextResponse.json({ ok: true, kind: msg.kind });
  }

  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Pick a name first." }, { status: 401 });

  const show = getShow(showId);
  if (!show) return NextResponse.json({ error: "Show not found." }, { status: 404 });
  if (show.status !== "live") return NextResponse.json({ error: "The show isn't live." }, { status: 400 });

  const now = Date.now();
  if (now - (lastMessageAt.get(viewer.id) ?? 0) < 700) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }
  lastMessageAt.set(viewer.id, now);

  const { text } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const message = postMessage(showId, viewer, text);
  return NextResponse.json({ ok: Boolean(message), kind: message?.kind });
}
