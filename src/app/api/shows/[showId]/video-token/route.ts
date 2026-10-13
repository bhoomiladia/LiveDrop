import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getShow } from "@/lib/live";
import { getViewer, requireSeller } from "@/lib/viewer";

// Issues a short-lived LiveKit pass for this show's video room.
// The seller may publish camera + mic; everyone else may only watch.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/video-token">) {
  const { showId } = await ctx.params;
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: "Live video isn't set up (LiveKit keys missing)." }, { status: 503 });
  }

  const show = getShow(showId);
  if (!show) return NextResponse.json({ error: "Show not found." }, { status: 404 });
  if (show.status === "ended") return NextResponse.json({ error: "This show has ended." }, { status: 410 });

  const seller = await requireSeller(showId);
  const viewer = seller ? null : await getViewer();
  const identity = seller ? `seller-${seller.userId}` : `viewer-${viewer?.id ?? crypto.randomUUID()}`;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: seller ? "Seller" : (viewer?.name ?? "Guest"),
    ttl: "3h",
  });
  token.addGrant({
    roomJoin: true,
    room: `livedrop-${showId}`,
    canPublish: Boolean(seller),
    canSubscribe: !seller,
    canPublishData: false,
  });

  return NextResponse.json({ url: LIVEKIT_URL, token: await token.toJwt(), role: seller ? "seller" : "viewer" });
}
