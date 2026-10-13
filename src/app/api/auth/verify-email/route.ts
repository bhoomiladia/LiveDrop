import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());
    const db = getDb();

    // Look up token
    const tokenQuery = db.prepare("SELECT * FROM verification_tokens WHERE token_hash = ?");
    const record = tokenQuery.get(tokenHash) as { id: string; identifier: string; expires_at: number } | undefined;

    if (!record) {
      return NextResponse.json(
        { error: "This verification link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (record.expires_at < Date.now()) {
      db.prepare("DELETE FROM verification_tokens WHERE id = ?").run(record.id);
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark user verified
    db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE email = ?").run(
      Date.now(),
      record.identifier
    );

    // Invalidate token (single use)
    db.prepare("DELETE FROM verification_tokens WHERE id = ?").run(record.id);

    return NextResponse.json({
      success: true,
      message: "Your email has been successfully verified. You may now log in to Live Drop.",
    });
  } catch (error) {
    console.error("[Verify Email API Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during email verification." }, { status: 500 });
  }
}
