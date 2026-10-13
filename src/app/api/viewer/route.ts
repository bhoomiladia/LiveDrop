import { NextResponse } from "next/server";
import { cleanName, getViewer, setViewer } from "@/lib/viewer";

export async function GET() {
  return NextResponse.json({ viewer: await getViewer() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) {
    return NextResponse.json({ error: "Pick a name with 2 to 24 letters or numbers." }, { status: 400 });
  }
  return NextResponse.json({ viewer: await setViewer(name) });
}
