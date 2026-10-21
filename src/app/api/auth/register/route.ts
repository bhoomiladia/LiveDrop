import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { col, newUser, withId } from "@/lib/db";
import { normalizeEmail, validateEmail, validatePassword, hashPassword, generateSecureToken, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { demoMode, isDemoEmail } from "@/lib/demo-script";
import { resetDemoAccount } from "@/lib/demo-video";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword, role } = body;

    // 1. Validate fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    // Seller or buyer is fixed for the life of the account.
    if (role !== "seller" && role !== "buyer") {
      return NextResponse.json({ error: "Choose whether you want to sell or shop." }, { status: 400 });
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
    const users = await col("users");
    const tokens = await col("verification_tokens");

    // Demo video: a scripted account starts over on every take, and gets its verification link back
    // here instead of by email (the addresses aren't real inboxes).
    const demo = demoMode && isDemoEmail(cleanEmail);
    if (demo) await resetDemoAccount(cleanEmail);

    // 2. Check for duplicate account
    const existingUser = await users.findOne({ email: cleanEmail }, { projection: { id: 1, email_verified: 1 } });

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
        await users.updateOne({ id: existingUser.id }, { $set: { name: cleanName, password_hash: passwordHash, role, updated_at: now } });

        // Invalidate old tokens for this email
        await tokens.deleteMany({ identifier: cleanEmail });

        const token = generateSecureToken();
        const tokenHash = hashToken(token);
        const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

        await tokens.insertOne(withId({ id: crypto.randomUUID(), identifier: cleanEmail, token_hash: tokenHash, expires_at: expiresAt, created_at: now }));

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

    await users.insertOne(
      newUser({ id: userId, name: cleanName, email: cleanEmail, password_hash: passwordHash, role, created_at: now, updated_at: now, ...(demo ? { demo: 1 } : {}) }),
    );

    // 4. Generate verification token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours

    await tokens.insertOne(withId({ id: crypto.randomUUID(), identifier: cleanEmail, token_hash: tokenHash, expires_at: expiresAt, created_at: now }));

    // 5. Send verification email
    if (demo) {
      return NextResponse.json({ success: true, message: "Account created. Verify your email to sign in.", demoVerifyLink: `/verify-email?token=${token}` });
    }
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
