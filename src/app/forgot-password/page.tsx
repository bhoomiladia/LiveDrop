"use client";

import * as React from "react";
import Link from "next/link";
import AuthShell, { AuthHeading } from "@/components/auth/auth-shell";
import { IconCheck } from "@/components/ui/icons";
import { Button, ButtonLink, Field, Input, Notice } from "@/components/ui/kit";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Please enter your email address.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) setSubmitted(true);
      else setError((await res.json()).error || "Couldn't start the password reset.");
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthShell kicker="Account recovery" title="Check your inbox." subtitle="If an account uses that email, a reset link is on its way. It expires in 60 minutes." navAction={{ label: "Sign in", href: "/login" }}>
        <div className="w-12 h-12 rounded-full bg-success-tint text-success grid place-items-center mb-6">
          <IconCheck size={22} />
        </div>
        <AuthHeading title="Reset link sent" text={`If an account is registered to ${email}, you'll get an email with a link to choose a new password.`} />
        <ButtonLink href="/login" size="lg" className="w-full">
          Back to sign in
        </ButtonLink>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-4 w-full text-[13px] text-muted hover:text-ink">
          Use a different email
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell kicker="Account recovery" title="Locked out? Let's fix that." subtitle="Enter the email you signed up with and we'll send you a link to choose a new password." navAction={{ label: "Sign in", href: "/login" }}>
      <AuthHeading title="Forgot your password?" text="We'll email you a link to reset it." />
      {error && (
        <Notice tone="error" className="mb-5">
          {error}
        </Notice>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email">
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-[13px] text-muted mt-6">
        Remembered it?{" "}
        <Link href="/login" className="text-ember font-medium hover:text-ink">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
