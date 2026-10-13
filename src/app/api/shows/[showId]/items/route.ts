import { NextResponse, type NextRequest } from "next/server";
import { createListing } from "@/lib/live";
import { requireSeller } from "@/lib/viewer";

const MAX_IMAGE_CHARS = 400_000; // ~300 KB JPEG as a data URL

// The seller said something and (optionally) sent a photo: make a draft listing.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/items">) {
  const { showId } = await ctx.params;
  const seller = await requireSeller(showId);
  if (!seller) return NextResponse.json({ error: "Only this show's seller can add items." }, { status: 403 });
  if (seller.show.status === "ended") return NextResponse.json({ error: "This show has ended." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const transcript = typeof body.transcript === "string" ? body.transcript.trim().slice(0, 500) : "";
  if (!transcript) return NextResponse.json({ error: "Say (or type) what the item is and its price." }, { status: 400 });

  let image: string | null = null;
  if (typeof body.image === "string" && body.image.startsWith("data:image/jpeg;base64,")) {
    if (body.image.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: "Photo is too large." }, { status: 413 });
    image = body.image;
  }

  const item = createListing(showId, transcript, image);
  return NextResponse.json({ item });
}
