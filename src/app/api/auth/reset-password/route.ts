import { NextResponse } from "next/server";
import { getDb, UserRecord } from "@/lib/db";
import { hashToken, validatePassword, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Password reset token is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());
    const db = getDb();

    // Look up token
    const tokenRecord = db
      .prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?")
      .get(tokenHash) as { id: string; identifier: string; expires_at: number } | undefined;

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (tokenRecord.expires_at < Date.now()) {
      db.prepare("DELETE FROM password_reset_tokens WHERE id = ?").run(tokenRecord.id);
      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find user
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(tokenRecord.identifier) as UserRecord | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unable to find associated account." }, { status: 404 });
    }

    // Update password & verify email if resetting via confirmed token
    const newPasswordHash = await hashPassword(password);
    const now = Date.now();

    db.prepare("UPDATE users SET password_hash = ?, email_verified = 1, updated_at = ? WHERE id = ?").run(
      newPasswordHash,
      now,
      user.id
    );

    // Invalidate reset token
    db.prepare("DELETE FROM password_reset_tokens WHERE id = ?").run(tokenRecord.id);

    // Invalidate existing sessions for this user for security
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new credentials.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during password reset." }, { status: 500 });
  }
}
