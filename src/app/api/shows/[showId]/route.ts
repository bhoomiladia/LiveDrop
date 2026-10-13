import { NextResponse, type NextRequest } from "next/server";
import { showSnapshot } from "@/lib/live";
import { getViewer } from "@/lib/viewer";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]">) {
  const { showId } = await ctx.params;
  const viewer = await getViewer();
  const snapshot = showSnapshot(showId, viewer?.id);
  if (!snapshot) return NextResponse.json({ error: "Show not found." }, { status: 404 });
  return NextResponse.json({ ...snapshot, viewer });
}
