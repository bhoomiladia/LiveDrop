import { NextResponse, type NextRequest } from "next/server";
import { listOrders } from "@/lib/aftershow";
import { requireSeller } from "@/lib/viewer";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/shows/[showId]/orders">) {
  const { showId } = await ctx.params;
  if (!(await requireSeller(showId))) return NextResponse.json({ error: "Only this show's seller can see orders." }, { status: 403 });
  return NextResponse.json(await listOrders(showId));
}
