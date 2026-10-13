import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, UserRecord } from "@/lib/db";
import { normalizeEmail, validateEmail, generateSecureToken, hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

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

    if (user && user.password_hash) {
      // Invalidate existing reset tokens for this user
      db.prepare("DELETE FROM password_reset_tokens WHERE identifier = ?").run(cleanEmail);

      const token = generateSecureToken();
      const tokenHash = hashToken(token);
      const now = Date.now();
      const expiresAt = now + 1000 * 60 * 60; // 1 hour

      db.prepare("INSERT INTO password_reset_tokens (id, identifier, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        cleanEmail,
        tokenHash,
        expiresAt,
        now
      );

      await sendPasswordResetEmail(cleanEmail, token);
    }

    // Uniform response to prevent account enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email address, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
