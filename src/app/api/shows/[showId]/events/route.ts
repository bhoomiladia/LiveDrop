import type { NextRequest } from "next/server";
import { subscribe, viewerCount, publish, type ShowEvent } from "@/lib/events";
import { getShow } from "@/lib/live";
import { getViewer, requireSeller } from "@/lib/viewer";

const PRIVATE_EVENTS = new Set(["bag", "bid_too_low", "shipped", "refunded"]);

// Server-Sent Events: one long-lived response per viewer that receives live updates.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/events">) {
  const { showId } = await ctx.params;
  if (!getShow(showId)) return new Response("Show not found", { status: 404 });

  const isSeller = Boolean(await requireSeller(showId));
  const viewer = await getViewer();
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: ShowEvent) => {
        // Seller-only drafts and private bag updates are filtered here, on the server.
        if (event.audience === "seller" && !isSeller) return;
        // Private, per-buyer updates only go to that buyer.
        if (PRIVATE_EVENTS.has(event.type) && event.viewer_id !== viewer?.id) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const unsubscribe = subscribe(showId, send);
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 20_000);
      publish(showId, { type: "presence", viewers: viewerCount(showId) });
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        publish(showId, { type: "presence", viewers: viewerCount(showId) });
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
