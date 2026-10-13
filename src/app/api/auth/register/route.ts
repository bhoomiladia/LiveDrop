import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { normalizeEmail, validateEmail, validatePassword, hashPassword, generateSecureToken, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    // 1. Validate fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !validateEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanName = name.trim();
    const db = getDb();

    // 2. Check for duplicate account
    const existingQuery = db.prepare("SELECT id, email_verified FROM users WHERE email = ?");
    const existingUser = existingQuery.get(cleanEmail) as { id: string; email_verified: number } | undefined;

    if (existingUser) {
      if (existingUser.email_verified === 1) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please log in." },
          { status: 409 }
        );
      } else {
        // Unverified account exists: update password & issue a fresh verification token
        const passwordHash = await hashPassword(password);
        const now = Date.now();
        db.prepare("UPDATE users SET name = ?, password_hash = ?, updated_at = ? WHERE id = ?").run(
          cleanName,
          passwordHash,
          now,
          existingUser.id
        );

        // Invalidate old tokens for this email
        db.prepare("DELETE FROM verification_tokens WHERE identifier = ?").run(cleanEmail);

        const token = generateSecureToken();
        const tokenHash = hashToken(token);
        const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

        db.prepare("INSERT INTO verification_tokens (id, identifier, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
          crypto.randomUUID(),
          cleanEmail,
          tokenHash,
          expiresAt,
          now
        );

        await sendVerificationEmail(cleanEmail, token);

        return NextResponse.json({
          success: true,
          message: "Verification email resent. Please check your inbox to activate your account.",
        });
      }
    }

    // 3. Create new user
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = Date.now();

    db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)").run(
      userId,
      cleanName,
      cleanEmail,
      passwordHash,
      now,
      now
    );

    // 4. Generate verification token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

    db.prepare("INSERT INTO verification_tokens (id, identifier, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      cleanEmail,
      tokenHash,
      expiresAt,
      now
    );

    // 5. Send verification email
    await sendVerificationEmail(cleanEmail, token);

    return NextResponse.json({
      success: true,
      message: "Account created successfully. Please verify your email before logging in.",
    });
  } catch (error) {
    console.error("[Register API Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during registration." }, { status: 500 });
  }
}
