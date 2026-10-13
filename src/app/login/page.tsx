"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/auth-shell";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  const getInitialError = () => {
    if (errorParam === "google_unconfigured") {
      return "Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
    }
    if (errorParam === "oauth_cancelled") {
      return "Google Sign-In was cancelled.";
    }
    if (errorParam === "state_mismatch" || errorParam === "token_exchange_failed") {
      return "Authentication failed during Google Sign-In. Please try again.";
    }
    return "";
  };

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(getInitialError);
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendSuccess(false);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        if (data.needsVerification) {
          setNeedsVerification(true);
        }
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to connect to the authentication service. Please check your connection.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendSuccess(true);
      }
    } catch {
      setError("Failed to resend verification email. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      kicker="WELCOME BACK"
      title="Make Your Money Work Smarter."
      subtitle="Sign in to open your studio, go live, and get paid with PayPal."
      badgeLabel="Security Status"
      badgeValue="Encrypted Session Ready"
      progressPercent={92}
      navAction={{ label: "Get Started Free", href: "/signup" }}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
          Sign in to Live Drop
        </h2>
        <p className="text-xs text-[#686c75] mt-1">
          Enter your account details to access your dashboard.
        </p>
      </div>

      {error && (
        <div
          className={`mb-5 p-3.5 rounded-lg text-xs ${
            needsVerification
              ? "bg-[#e9f0fd] text-[#173892] border border-[#2659d9]/30"
              : "bg-[#fdecea] text-[#c63b33] border border-[#c63b33]/20"
          }`}
          role="alert"
        >
          <p className="font-semibold">{error}</p>
          {needsVerification && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || resendSuccess}
                className="text-xs font-semibold text-[#2659d9] underline hover:no-underline disabled:opacity-50"
              >
                {resending
                  ? "Sending..."
                  : resendSuccess
                  ? "✓ Verification link resent to your email!"
                  : "Click here to resend verification email"}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1.5"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#0c0e13]/80"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#2659d9] hover:text-[#0c0e13] font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 pr-12 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#686c75] hover:text-[#0c0e13]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Primary Accent Button (Matches template register button) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0c0e13]/20 border-t-[#0c0e13] rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <span className="text-base font-bold">↗</span>
            </>
          )}
        </button>
      </form>

      <p className="text-[11.5px] text-[#686c75] text-center mt-3">
        Encrypted sessions with server-side authorization and protected cookies.
      </p>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#0c0e13]/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[#686c75] text-[11px] font-medium">
            or continue with
          </span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <div>
        <a
          href="/api/auth/google"
          className="w-full h-11 border border-[#0c0e13]/12 bg-white hover:bg-[#f4f7fd] text-[#0c0e13] rounded-[6px] text-sm font-medium transition-all flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </a>
      </div>

      <p className="text-center text-xs text-[#686c75] mt-5">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#2659d9] font-semibold hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginContent />
    </React.Suspense>
  );
}
