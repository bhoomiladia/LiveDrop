"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/auth/auth-shell";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = React.useState<"loading" | "success" | "error" | "manual">(
    token ? "loading" : "manual"
  );
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [resending, setResending] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully.");
        } else {
          setStatus("error");
          setMessage(data.error || "The verification link is invalid or has expired.");
        }
      } catch {
        if (!isMounted) return;
        setStatus("error");
        setMessage("Unable to connect to verification service. Please try again.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setResending(true);
    setResendStatus("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setResendStatus("A fresh verification link has been sent to your email address.");
      } else {
        setResendStatus("Failed to send verification link. Please check your email address.");
      }
    } catch {
      setResendStatus("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      kicker="ACCOUNT ACTIVATION"
      title="Make Your Money Flow Smarter."
      subtitle="Complete your verification to unlock intelligent invoice tracking, AI follow-ups, and automated payment insights."
      badgeLabel="Security Layer"
      badgeValue="Cryptographic Email Token"
      progressPercent={status === "success" ? 100 : 50}
      navAction={{ label: "Sign In", href: "/login" }}
    >
      {status === "loading" && (
        <div className="py-6 text-center">
          <div className="w-10 h-10 border-3 border-[#2659d9]/20 border-t-[#2659d9] rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#0c0e13]">Activating credentials...</h2>
          <p className="mt-1 text-xs text-[#686c75]">Confirming single-use cryptographic token.</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[#e9f0fd] text-[#2659d9] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
            ✓
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
            Email Verified!
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
            {message || "Your Live Drop account is now active and ready."}
          </p>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Sign In to Dashboard</span>
              <span className="text-base font-bold">↗</span>
            </Link>
          </div>
        </div>
      )}

      {(status === "error" || status === "manual") && (
        <div className="text-center py-2">
          {status === "error" && (
            <>
              <div className="w-14 h-14 bg-[#fdecea] text-[#c63b33] rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-sm">
                !
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
                Verification Link Expired
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
                {message || "This verification link is invalid, expired, or has already been used."}
              </p>
            </>
          )}

          {status === "manual" && (
            <>
              <div className="w-14 h-14 bg-[#e9f0fd] text-[#2659d9] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                ✉️
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
                Verify Your Account
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
                Enter your email address below to receive a fresh verification link.
              </p>
            </>
          )}

          <form onSubmit={handleResend} className="mt-6 text-left space-y-3.5">
            {resendStatus && (
              <p className="text-xs font-semibold text-[#16a34a] bg-[#f0fdf4] py-2 px-3 rounded-lg border border-[#bbf7d0]">
                {resendStatus}
              </p>
            )}

            <div>
              <label
                htmlFor="resend-email"
                className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
              >
                Work email
              </label>
              <input
                id="resend-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-11 px-3.5 rounded-[6px] border-0 bg-[color-mix(in_srgb,#e9f0fd_60%,#fff)] shadow-[inset_0_0_0_1px_rgba(12,14,19,0.13)] text-sm text-[#0c0e13] outline-none transition-all focus:bg-white focus:shadow-[inset_0_0_0_1.5px_#2659d9,0_0_0_4px_rgba(38,89,217,0.16)] hover:shadow-[inset_0_0_0_1px_rgba(12,14,19,0.26)] placeholder-[#686c75]/60"
              />
            </div>

            <button
              type="submit"
              disabled={resending}
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
            >
              {resending ? (
                <span>Sending link...</span>
              ) : (
                <>
                  <span>Send Verification Link</span>
                  <span className="text-base font-bold">↗</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#0c0e13]/8">
            <Link href="/login" className="text-xs text-[#2659d9] font-semibold hover:underline">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
