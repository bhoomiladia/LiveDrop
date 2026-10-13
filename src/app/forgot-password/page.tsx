"use client";

import * as React from "react";
import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to process password reset request.");
      }
    } catch {
      setError("Unable to connect to service. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthShell
        kicker="ACCOUNT RECOVERY"
        title="Check Your Inbox."
        subtitle={`If an account is associated with ${email}, a single-use recovery link has been dispatched.`}
        badgeLabel="Recovery Link"
        badgeValue="Expiring in 60 Minutes"
        progressPercent={50}
        navAction={{ label: "Sign In", href: "/login" }}
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[#e9f0fd] text-[#2659d9] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
            ✉️
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
            Recovery link sent
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
            Please check your spam or junk folder if the recovery message does not appear in your inbox within a few minutes.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Return to Sign In</span>
              <span className="text-base font-bold">↗</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="text-xs text-[#686c75] hover:text-[#2659d9] underline font-medium py-1 transition-colors"
            >
              Try a different email address
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="ACCOUNT RECOVERY"
      title="Never Lose Access to Your Flow."
      subtitle="Forgot your password? Enter your verified work email address below to receive an encrypted password reset link."
      badgeLabel="Recovery Security"
      badgeValue="Cryptographic Hashes Only"
      progressPercent={100}
      navAction={{ label: "Sign In", href: "/login" }}
    >
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
          Reset your password
        </h2>
        <p className="text-xs text-[#686c75] mt-1">
          We&apos;ll send a single-use link to your inbox.
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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1.5"
          >
            Work email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0c0e13]/20 border-t-[#0c0e13] rounded-full animate-spin" />
              <span>Sending recovery link...</span>
            </>
          ) : (
            <>
              <span>Send Recovery Link</span>
              <span className="text-base font-bold">↗</span>
            </>
          )}
        </button>
      </form>

      <p className="text-[11.5px] text-[#686c75] text-center mt-3">
        Links expire automatically after 1 hour for your protection.
      </p>

      <div className="mt-5 pt-4 border-t border-[#0c0e13]/8 text-center">
        <Link href="/login" className="text-xs text-[#2659d9] font-semibold hover:underline">
          ← Back to Sign In
        </Link>
      </div>
    </AuthShell>
  );
}
