"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { AuthHeading, GoogleButton, OrDivider, PasswordInput } from "@/components/auth/auth-shell";
import { Button, Field, Input, Notice } from "@/components/ui/kit";

const OAUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't set up on this server yet. Use email and password instead.",
  oauth_cancelled: "Google sign-in was cancelled.",
  state_mismatch: "Google sign-in didn't complete. Please try again.",
  token_exchange_failed: "Google sign-in didn't complete. Please try again.",
};

// Only same-site paths are allowed after sign-in.
function safeCallback(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const errorParam = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(() => (errorParam ? (OAUTH_ERRORS[errorParam] ?? "") : ""));
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
        setError(data.error || "Login failed. Please check your details.");
        if (data.needsVerification) setNeedsVerification(true);
        setLoading(false);
        return;
      }
      // Accounts that haven't finished setup go through onboarding first, then on to where they were headed.
      router.push(data.user?.onboarded ? callbackUrl : `/onboarding?next=${encodeURIComponent(callbackUrl)}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
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
      if (res.ok) setResendSuccess(true);
    } catch {
      setError("Failed to resend the verification email. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      kicker="Welcome back"
      title="Go live. Say the price. Get paid."
      subtitle="Sign in to open your studio, or to pick up your bag and orders where you left them."
      navAction={{ label: "Create account", href: `/signup${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}` }}
    >
      <AuthHeading title="Sign in" text="Sellers land in their studio dashboard, buyers in their bag and orders." />

      {error && (
        <Notice tone={needsVerification ? "ember" : "error"} className="mb-5">
          <p className="font-medium">{error}</p>
          {needsVerification && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending || resendSuccess}
              className="mt-1.5 text-[13px] font-medium text-ember underline underline-offset-2 disabled:no-underline disabled:text-success"
            >
              {resending ? "Sending…" : resendSuccess ? "Verification link sent. Check your inbox." : "Resend the verification email"}
            </button>
          )}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email">
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" className="text-[13px] font-medium">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-ember hover:text-ink">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="current-password" />
        </div>
        <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="text-center text-[13px] text-muted mt-6">
        New to Live Drop?{" "}
        <Link href="/signup" className="text-ember font-medium hover:text-ink">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginContent />
    </React.Suspense>
  );
}
