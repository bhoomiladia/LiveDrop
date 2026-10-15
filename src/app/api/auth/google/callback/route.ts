import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { col, newUser, withId } from "@/lib/db";
import { createSessionToken, setSessionCookie, normalizeEmail } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (error) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "oauth_cancelled");
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "invalid_oauth_request");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("livedrop_oauth_state")?.value;
  cookieStore.delete("livedrop_oauth_state");

  if (!savedState || savedState !== state) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "state_mismatch");
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "google_unconfigured");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Google OAuth Token Error]:", await tokenResponse.text());
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(loginUrl);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("error", "profile_fetch_failed");
      return NextResponse.redirect(loginUrl);
    }

    const profile = await profileResponse.json();
    const googleId = profile.sub;
    const email = normalizeEmail(profile.email);
    const name = profile.name || email.split("@")[0];
    const picture = profile.picture || null;

    const users = await col("users");
    const accounts = await col("accounts");

    // 3. Check for existing user account
    let user = await users.findOne({ email });
    const now = Date.now();
    const linkGoogle = (userId: string) =>
      accounts.updateOne(
        { provider: "google", provider_account_id: googleId },
        { $setOnInsert: withId({ id: crypto.randomUUID(), user_id: userId, provider: "google", provider_account_id: googleId, created_at: now }) },
        { upsert: true }
      );

    if (user) {
      // User exists: update verification status if needed and link account
      if (user.email_verified === 0) {
        await users.updateOne({ id: user.id }, { $set: { email_verified: 1, image: user.image ?? picture, updated_at: now } });
      }

      // Ensure Google account linkage exists
      await linkGoogle(user.id);
    } else {
      // Create new user verified through Google
      user = newUser({ id: crypto.randomUUID(), name, email, email_verified: 1, image: picture, created_at: now, updated_at: now });
      await users.insertOne(user);

      // Link Google provider account
      await linkGoogle(user.id);
    }

    // 4. Issue session token and cookie
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await setSessionCookie(sessionToken);

    // New Google accounts pick seller or buyer in onboarding; the dashboard sends them there.
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  } catch (error) {
    console.error("[Google OAuth Callback Error]:", error);
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", "unexpected_oauth_error");
    return NextResponse.redirect(loginUrl);
  }
}
