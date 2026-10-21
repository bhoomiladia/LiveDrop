"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell, { AuthHeading, GoogleButton, OrDivider, PasswordChecklist, PasswordInput, passwordOk } from "@/components/auth/auth-shell";
import RoleChoice from "@/components/auth/role-choice";
import { IconCheck } from "@/components/ui/icons";
import { Button, ButtonLink, Field, Input, Notice } from "@/components/ui/kit";
import { DEMO, rememberDemoRole } from "@/lib/demo-script";

function SignupContent() {
  const searchParams = useSearchParams();
  const presetRole = searchParams.get("role");
  const callbackUrl = searchParams.get("callbackUrl");
  const loginHref = `/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;

  const [role, setRole] = React.useState<"seller" | "buyer" | null>(presetRole === "seller" || presetRole === "buyer" ? presetRole : null);
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
  const [demoVerifyLink, setDemoVerifyLink] = React.useState<string | null>(null);
  // Demo video: the fields type the scripted account for the chosen role.
  const demo = role ? DEMO[role] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!role) return setError("Choose whether you want to sell or shop.");
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!passwordOk(password)) return setError("Your password doesn't meet all the requirements yet.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, confirmPassword, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create your account. Please check your details.");
        return;
      }
      if (data.demoVerifyLink) {
        setDemoVerifyLink(data.demoVerifyLink);
        rememberDemoRole(role);
      }
      setSuccess(true);
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
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
      if (res.ok) setResendStatus("A fresh verification email is on its way.");
    } catch {
      setResendStatus("Failed to resend. Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <AuthShell kicker="Almost there" title="Check your inbox." subtitle={`We sent a verification link to ${email}. Open it to activate your account.`} navAction={{ label: "Sign in", href: loginHref }}>
        <div className="w-12 h-12 rounded-full bg-success-tint text-success grid place-items-center mb-6">
          <IconCheck size={22} />
        </div>
        <AuthHeading title="Verify your email" text={`We sent a link to ${email}. Click it, then sign in to set up your ${role === "seller" ? "shop" : "profile"}.`} />
        {demoVerifyLink && <DemoInboxEmail href={demoVerifyLink} />}
        {resendStatus && (
          <Notice tone="success" className="mb-4">
            {resendStatus}
          </Notice>
        )}
        <ButtonLink href={loginHref} size="lg" className="w-full">
          Go to sign in
        </ButtonLink>
        <button type="button" onClick={handleResend} disabled={resending} className="mt-4 w-full text-[13px] text-muted hover:text-ink disabled:opacity-50">
          {resending ? "Sending a fresh link…" : "Didn't get it? Send it again"}
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Get started"
      title="Sell live. Shop live. Pay with PayPal."
      subtitle="Sellers go live and let AI handle listings, claims and checkout. Buyers claim in one tap, or send an AI agent to shop for them."
      navAction={{ label: "Sign in", href: loginHref }}
    >
      <AuthHeading title="Create your account" />

      {error && (
        <Notice tone="error" className="mb-5">
          {error}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <p className="text-[13px] font-medium mb-1.5">I&apos;m here to</p>
          <RoleChoice value={role} onChange={setRole} />
          <p className="text-xs text-muted mt-2">Seller and buyer accounts are separate. You can&apos;t switch later.</p>
        </div>
        <Field label="Name">
          <Input id="name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" demo={demo?.name} />
        </Field>
        <Field label="Email">
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" demo={demo?.email} />
        </Field>
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium mb-1.5">
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            autoComplete="new-password"
            demo={demo?.password}
          />
          <PasswordChecklist password={password} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-[13px] font-medium mb-1.5">
            Confirm password
          </label>
          <PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} show={showPassword} autoComplete="new-password" demo={demo?.password} />
        </div>
        <Button type="submit" disabled={loading} size="lg" className="w-full mt-2">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton label="Sign up with Google" />
      <p className="text-xs text-muted text-center mt-2.5">With Google, you choose seller or buyer on the next screen.</p>

      <p className="text-center text-[13px] text-muted mt-6">
        Already have an account?{" "}
        <Link href={loginHref} className="text-brand font-medium hover:text-ink">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

// Demo video: scripted accounts get no real email, so the verification email shows up here instead.
function DemoInboxEmail({ href }: { href: string }) {
  return (
    <div className="mb-5 rounded-[10px] border border-line bg-canvas p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Inbox · Live Drop · just now</p>
      <p className="mt-2 text-sm font-semibold">Verify your Live Drop account</p>
      <p className="mt-1 text-[13px] text-muted leading-relaxed">Thanks for signing up for Live Drop. Please confirm your email address to get started.</p>
      <ButtonLink href={href} variant="brand" size="sm" className="mt-3">
        Verify email address
      </ButtonLink>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <SignupContent />
    </React.Suspense>
  );
}
