import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "livedrop_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "livedrop-default-development-secret-key-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getSecretKey(), { algorithms: ["HS256"] });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. Protect account pages (role and onboarding checks happen in the pages themselves)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/studio") || pathname.startsWith("/onboarding")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      const callbackPath = pathname + search;
      // Prevent open redirect
      if (callbackPath.startsWith("/") && !callbackPath.startsWith("//")) {
        loginUrl.searchParams.set("callbackUrl", callbackPath);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Redirect logged-in users away from /login and /signup
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard", "/studio/:path*", "/studio", "/onboarding", "/login", "/signup"],
};
