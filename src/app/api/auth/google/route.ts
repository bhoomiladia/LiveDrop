import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // If credentials are not configured, redirect to login with a clear explanatory error
  if (!clientId || !clientSecret || clientId === "YOUR_GOOGLE_CLIENT_ID") {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "google_unconfigured");
    return NextResponse.redirect(loginUrl);
  }

  // Generate cryptographically secure state token for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("livedrop_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl);
}
