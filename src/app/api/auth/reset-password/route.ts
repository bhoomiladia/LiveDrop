import { NextResponse } from "next/server";
import { col } from "@/lib/db";
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
    const tokens = await col("password_reset_tokens");
    const users = await col("users");

    // Look up token
    const tokenRecord = await tokens.findOne({ token_hash: tokenHash });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (tokenRecord.expires_at < Date.now()) {
      await tokens.deleteOne({ id: tokenRecord.id });
      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find user
    const user = await users.findOne({ email: tokenRecord.identifier });
    if (!user) {
      return NextResponse.json({ error: "Unable to find associated account." }, { status: 404 });
    }

    // Update password & verify email if resetting via confirmed token
    const newPasswordHash = await hashPassword(password);
    const now = Date.now();

    await users.updateOne({ id: user.id }, { $set: { password_hash: newPasswordHash, email_verified: 1, updated_at: now } });

    // Invalidate reset token
    await tokens.deleteOne({ id: tokenRecord.id });

    // Invalidate existing sessions for this user for security
    await (await col("sessions")).deleteMany({ user_id: user.id });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new credentials.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during password reset." }, { status: 500 });
  }
}
