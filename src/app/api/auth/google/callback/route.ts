import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, UserRecord } from "@/lib/db";
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

    const db = getDb();

    // 3. Check for existing user account
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRecord | undefined;
    const now = Date.now();

    if (user) {
      // User exists: update verification status if needed and link account
      if (user.email_verified === 0) {
        db.prepare("UPDATE users SET email_verified = 1, image = COALESCE(image, ?), updated_at = ? WHERE id = ?").run(
          picture,
          now,
          user.id
        );
      }

      // Ensure Google account linkage exists
      const account = db.prepare("SELECT * FROM accounts WHERE provider = 'google' AND provider_account_id = ?").get(googleId);
      if (!account) {
        db.prepare("INSERT INTO accounts (id, user_id, provider, provider_account_id, created_at) VALUES (?, ?, 'google', ?, ?)").run(
          crypto.randomUUID(),
          user.id,
          googleId,
          now
        );
      }
    } else {
      // Create new user verified through Google
      const newUserId = crypto.randomUUID();
      db.prepare("INSERT INTO users (id, name, email, password_hash, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?, ?)").run(
        newUserId,
        name,
        email,
        picture,
        now,
        now
      );

      // Link Google provider account
      db.prepare("INSERT INTO accounts (id, user_id, provider, provider_account_id, created_at) VALUES (?, ?, 'google', ?, ?)").run(
        crypto.randomUUID(),
        newUserId,
        googleId,
        now
      );

      user = db.prepare("SELECT * FROM users WHERE id = ?").get(newUserId) as UserRecord;
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
