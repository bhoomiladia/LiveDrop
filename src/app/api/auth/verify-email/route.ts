import { NextResponse } from "next/server";
import { col } from "@/lib/db";
import { hashToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());
    const tokens = await col("verification_tokens");

    // Look up token
    const record = await tokens.findOne({ token_hash: tokenHash });

    if (!record) {
      return NextResponse.json(
        { error: "This verification link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (record.expires_at < Date.now()) {
      await tokens.deleteOne({ id: record.id });
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark user verified
    await (await col("users")).updateOne({ email: record.identifier }, { $set: { email_verified: 1, updated_at: Date.now() } });

    // Invalidate token (single use)
    await tokens.deleteOne({ id: record.id });

    return NextResponse.json({
      success: true,
      message: "Your email has been successfully verified. You may now log in to Live Drop.",
    });
  } catch (error) {
    console.error("[Verify Email API Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during email verification." }, { status: 500 });
  }
}
