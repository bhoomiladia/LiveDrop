import { NextResponse, type NextRequest } from "next/server";
import { releaseUnpaidNow } from "@/lib/live";
import { requireSeller } from "@/lib/viewer";

// Pass every unpaid claim to the next person in line right now.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/release">) {
  const { showId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can do that." }, { status: 403 });
  return NextResponse.json({ released: releaseUnpaidNow(showId) });
}
