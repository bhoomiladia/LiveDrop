import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { col, withId } from "@/lib/db";
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
    const user = await (await col("users")).findOne({ email: cleanEmail });

    if (user && user.email_verified === 0) {
      const tokens = await col("verification_tokens");
      // Remove old tokens
      await tokens.deleteMany({ identifier: cleanEmail });

      const token = generateSecureToken();
      const tokenHash = hashToken(token);
      const now = Date.now();
      const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

      await tokens.insertOne(withId({ id: crypto.randomUUID(), identifier: cleanEmail, token_hash: tokenHash, expires_at: expiresAt, created_at: now }));

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
