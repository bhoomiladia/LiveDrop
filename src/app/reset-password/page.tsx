"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import AuthShell, { AuthHeading, PasswordChecklist, PasswordInput, passwordOk } from "@/components/auth/auth-shell";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { Button, ButtonLink, Notice } from "@/components/ui/kit";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) return setError("The reset link is missing its token. Please use the link from your email.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!passwordOk(password)) return setError("Your new password doesn't meet all the requirements yet.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't reset your password. The link may have expired.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell kicker="Account recovery" title="That link doesn't work." subtitle="Reset links come from the email we sent you. Request a new one if it's expired." navAction={{ label: "Sign in", href: "/login" }}>
        <div className="w-12 h-12 rounded-full bg-tint text-ember grid place-items-center mb-6">
          <IconAlert size={22} />
        </div>
        <AuthHeading title="Invalid reset link" text="This link is missing its reset token. Request a new link and use it within 60 minutes." />
        <ButtonLink href="/forgot-password" size="lg" className="w-full">
          Request a new link
        </ButtonLink>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell kicker="Account recovery" title="You're back in." subtitle="Your password was changed and any other sessions were signed out." navAction={{ label: "Sign in", href: "/login" }}>
        <div className="w-12 h-12 rounded-full bg-success-tint text-success grid place-items-center mb-6">
          <IconCheck size={22} />
        </div>
        <AuthHeading title="Password updated" text="Sign in with your new password." />
        <ButtonLink href="/login" size="lg" className="w-full">
          Sign in
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Account recovery" title="Choose a new password." subtitle="Pick something you haven't used here before." navAction={{ label: "Sign in", href: "/login" }}>
      <AuthHeading title="Set a new password" />
      {error && (
        <Notice tone="error" className="mb-5">
          {error}
        </Notice>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium mb-1.5">
            New password
          </label>
          <PasswordInput id="password" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} autoComplete="new-password" />
          <PasswordChecklist password={password} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-[13px] font-medium mb-1.5">
            Confirm new password
          </label>
          <PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} autoComplete="new-password" />
        </div>
        <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
