import { NextResponse } from "next/server";
import { col } from "@/lib/db";
import { normalizeEmail, verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const user = await (await col("users")).findOne({ email: cleanEmail });

    if (!user) {
      // Use uniform message to avoid account discovery attacks
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.password_hash) {
      return NextResponse.json(
        { error: "This account was created using Google Sign-In. Please sign in with Google." },
        { status: 400 }
      );
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check verification status
    if (user.email_verified !== 1) {
      return NextResponse.json(
        {
          error: "Please verify your email address before logging in.",
          needsVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Issue secure session token
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboarded: Boolean(user.role && user.onboarded_at),
      },
    });
  } catch (error) {
    console.error("[Login API Error]:", error);
    return NextResponse.json({ error: "An unexpected error occurred during login." }, { status: 500 });
  }
}
