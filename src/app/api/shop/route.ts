import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getShopInfo, saveShopInfo } from "@/lib/rag";

// The seller's shop info (shipping, returns, sizing...): the knowledge the shop assistant answers from.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  return NextResponse.json({ info: await getShopInfo(user.id) });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const field = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 3000) : "");
  const info = { shipping: field(body.shipping), returns: field(body.returns), sizing: field(body.sizing), other: field(body.other) };
  const result = await saveShopInfo(user.id, info);
  return NextResponse.json({ ok: true, ...result });
}
