"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/components/auth/auth-shell";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const passwordRequirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please click the link sent to your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordRequirements.every((r) => r.met)) {
      setError("Please ensure your new password meets all security criteria.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password. The link may have expired.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to process password reset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        kicker="TOKEN MISSING"
        title="Invalid Reset Link."
        subtitle="No authentication token was detected in your reset request."
        badgeLabel="Security Check"
        badgeValue="Token Verification Failed"
        progressPercent={0}
        navAction={{ label: "Sign In", href: "/login" }}
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[#fdecea] text-[#c63b33] rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-sm">
            !
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
            Missing Security Token
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
            Please make sure you clicked the complete link from your recovery email.
          </p>
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Request New Reset Link</span>
              <span className="text-base font-bold">↗</span>
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        kicker="SECURITY UPDATED"
        title="Password Successfully Updated."
        subtitle="Your Live Drop account credentials have been reset. Previous sessions were terminated."
        badgeLabel="Session Security"
        badgeValue="All Sessions Cleared"
        progressPercent={100}
        navAction={{ label: "Sign In", href: "/login" }}
      >
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-[#e9f0fd] text-[#2659d9] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
            ✓
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
            Ready to Sign In
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#686c75] leading-relaxed">
            You can now log in to your workspace using your new password.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full h-12 bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] font-semibold text-sm rounded-[6px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_18px_-4px_rgba(228,242,34,0.7)] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Proceed to Sign In</span>
              <span className="text-base font-bold">↗</span>
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="SECURITY UPDATE"
      title="Set a New Password."
      subtitle="Choose a secure password for your Live Drop seller account."
      badgeLabel="Encryption"
      badgeValue="Argon2/Bcrypt Salted Hash"
      progressPercent={75}
      navAction={{ label: "Sign In", href: "/login" }}
    >
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight text-[#0c0e13]">
          Create new password
        </h2>
        <p className="text-xs text-[#686c75] mt-1">
          Must be at least 8 characters with numbers and letters.
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
            htmlFor="new-password"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
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
            htmlFor="confirm-new-password"
            className="block text-xs font-medium text-[#0c0e13]/80 mb-1"
          >
            Confirm new password
          </label>
          <input
            id="confirm-new-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
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
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <span className="text-base font-bold">↗</span>
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
