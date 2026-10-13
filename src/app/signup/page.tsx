"use client";

import * as React from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";

export default function SignupPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState("");

  const passwordRequirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordRequirements.every((r) => r.met)) {
      setError("Please ensure your password meets all requirements below.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account. Please check your information.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to process registration. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setResendStatus("A fresh verification email has been sent!");
      }
    } catch {
      setResendStatus("Failed to resend. Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        kicker="ACCOUNT CREATED"
        title="Check Your Inbox."
        subtitle={`We've dispatched a secure verification link to ${email}. Activate your account to start managing your cash flow.`}
        badgeLabel="Verification Link"
        badgeValue="Single-Use Token Dispatched"
        progressPercent={50}
        navAction={{ label: "Sign In", href: "/login" }}
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[#e9f0fd] text-[#2659d9] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
            ✉️
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
            Verify your email
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
            Please check your inbox and click the activation link to confirm your email and open your workspace.
          </p>

          {resendStatus && (
            <p className="mt-4 text-xs font-semibold text-[#16a34a] bg-[#f0fdf4] py-2 px-3 rounded-lg border border-[#bbf7d0]">
              {resendStatus}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Proceed to Sign In</span>
              <span className="text-base font-bold">↗</span>
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-[#686c75] hover:text-[#2659d9] underline font-medium py-1 disabled:opacity-50 transition-colors"
            >
              {resending ? "Sending fresh link..." : "Didn't receive an email? Click to resend"}
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="GET STARTED"
      title="Make Your Money Work Smarter."
      subtitle="Go live from your phone, say the price, and let Live Drop handle claims and PayPal checkout."
      badgeLabel="Access Tier"
      badgeValue="Free Starter Account"
      progressPercent={84}
      navAction={{ label: "Sign In", href: "/login" }}
    >
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
          Create your account
        </h2>
        <p className="text-xs text-[#686c75] mt-1">
          Create a seller account to run your first Live Drop show.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 p-3.5 rounded-lg text-xs bg-[#fdecea] text-[#c63b33] border border-[#c63b33]/20"
          role="alert"
        >
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            className="w-full h-10 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
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
            placeholder="alex@company.com"
            className="w-full h-10 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 pr-12 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
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

          {/* Password criteria chips */}
          <div className="grid grid-cols-2 gap-1 mt-2 pt-1.5 border-t border-[#0c0e13]/8">
            {passwordRequirements.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10.5px]">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8.5px] font-bold ${
                    r.met ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f1f5f9] text-[#94a3b8]"
                  }`}
                >
                  {r.met ? "✓" : "•"}
                </span>
                <span className={r.met ? "text-[#15803d] font-medium" : "text-[#686c75]"}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-10 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
          />
        </div>

        {/* Accent CTA button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0c0e13]/20 border-t-[#0c0e13] rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create Free Account</span>
              <span className="text-base font-bold">↗</span>
            </>
          )}
        </button>
      </form>

      <p className="text-[11.5px] text-[#686c75] text-center mt-3">
        Free to register. We verify every account securely before activation.
      </p>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#0c0e13]/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[#686c75] text-[11px] font-medium">
            or sign up with
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

      <p className="text-center text-xs text-[#686c75] mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-[#2659d9] font-semibold hover:underline">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
