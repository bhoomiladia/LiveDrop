import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { col, withId } from "@/lib/db";
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
    const user = await (await col("users")).findOne({ email: cleanEmail });

    if (user && user.password_hash) {
      const tokens = await col("password_reset_tokens");
      // Invalidate existing reset tokens for this user
      await tokens.deleteMany({ identifier: cleanEmail });

      const token = generateSecureToken();
      const tokenHash = hashToken(token);
      const now = Date.now();
      const expiresAt = now + 1000 * 60 * 60; // 1 hour

      await tokens.insertOne(withId({ id: crypto.randomUUID(), identifier: cleanEmail, token_hash: tokenHash, expires_at: expiresAt, created_at: now }));

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
