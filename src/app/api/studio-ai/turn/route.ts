import { NextResponse } from "next/server";
import type { AgLlmRequest } from "ag-studio";
import { getCurrentUser } from "@/lib/auth";
import { aiEnabled } from "@/lib/gemini";
import { runStudioTurn } from "@/lib/studio-ai";

// One turn of the Show Producer (AG Studio's agent framework), answered by Gemini.
// Sellers only, with a per-seller rate limit to protect the free AI quota.
const recent = new Map<string, number[]>();
const PER_MINUTE = 20;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: "AI isn't set up (GEMINI_API_KEY missing)." }, { status: 503 });

  const now = Date.now();
  const calls = (recent.get(user.id) ?? []).filter((t) => now - t < 60_000);
  if (calls.length >= PER_MINUTE) return NextResponse.json({ error: "Slow down a little: too many AI requests this minute." }, { status: 429 });
  recent.set(user.id, [...calls, now]);

  const request = (await req.json().catch(() => null)) as AgLlmRequest | null;
  if (!request || !Array.isArray(request.input)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json(await runStudioTurn(request, req.signal));
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = (err as Error).message ?? "";
    console.error("[studio-ai] turn failed", status, message.slice(0, 500));
    // A 400 means Gemini rejected the request itself (e.g. a tool schema): show why, it won't fix itself.
    const error =
      status === 400
        ? `Gemini rejected the request: ${(message.match(/"message":\s*"([^"]+)"/)?.[1] ?? message).slice(0, 300)}`
        : "The AI is busy right now (free tier). Please try again in a moment.";
    return NextResponse.json({ error }, { status: 502 });
  }
}
