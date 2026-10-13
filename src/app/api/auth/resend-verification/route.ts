import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, UserRecord } from "@/lib/db";
import { normalizeEmail, validateEmail, generateSecureToken, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !validateEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as UserRecord | undefined;

    if (user && user.email_verified === 0) {
      // Remove old tokens
      db.prepare("DELETE FROM verification_tokens WHERE identifier = ?").run(cleanEmail);

      const token = generateSecureToken();
      const tokenHash = hashToken(token);
      const now = Date.now();
      const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

      db.prepare("INSERT INTO verification_tokens (id, identifier, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        cleanEmail,
        tokenHash,
        expiresAt,
        now
      );

      await sendVerificationEmail(cleanEmail, token);
    }

    // Always return success to protect against user enumeration
    return NextResponse.json({
      success: true,
      message: "If an unverified account exists with this email, a verification link has been sent.",
    });
  } catch (error) {
    console.error("[Resend Verification Error]:", error);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}
