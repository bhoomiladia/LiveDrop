import { NextResponse, type NextRequest } from "next/server";
import { readShippingLabel } from "@/lib/aftershow";
import { requireSeller } from "@/lib/viewer";

// Snap a shipping label: the AI reads the carrier and tracking number for the seller to confirm.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/label">) {
  const { showId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { image } = await req.json().catch(() => ({}));
  if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,") || image.length > 800_000) {
    return NextResponse.json({ error: "Send a JPEG photo of the label." }, { status: 400 });
  }
  const label = await readShippingLabel(image.split(",")[1]);
  if (!label) return NextResponse.json({ error: "Couldn't read a tracking number. Try a sharper photo, or type it." }, { status: 422 });
  return NextResponse.json(label);
}
