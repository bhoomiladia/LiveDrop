"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import AuthShell, { AuthHeading } from "@/components/auth/auth-shell";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { Button, ButtonLink, Field, Input, Notice } from "@/components/ui/kit";

// One request per link, even when React runs the effect twice in development: a link only works once,
// so a second request would report it as already used.
const verifying = new Map<string, Promise<{ ok: boolean; message?: string; error?: string }>>();

function verifyOnce(token: string) {
  let request = verifying.get(token);
  if (!request) {
    request = fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (res) => ({ ok: res.ok, ...(await res.json()) }));
    request.catch(() => verifying.delete(token)); // network trouble: let a reload try again
    verifying.set(token, request);
  }
  return request;
}

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

    async function verify(token: string) {
      try {
        const data = await verifyOnce(token);

        if (!isMounted) return;

        if (data.ok) {
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

    verify(token);

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
      kicker="Account activation"
      title="One click and you're in."
      subtitle="Verifying your email keeps your shop, bag and PayPal payments tied to you."
      navAction={{ label: "Sign in", href: "/login" }}
    >
      {status === "loading" && (
        <div className="py-10 flex flex-col items-center text-center">
          <span className="w-8 h-8 rounded-full border-2 border-line-strong border-t-brand animate-spin" />
          <p className="mt-4 text-sm text-muted">Verifying your email…</p>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="w-12 h-12 rounded-full bg-success-tint text-success grid place-items-center mb-6">
            <IconCheck size={22} />
          </div>
          <AuthHeading title="Email verified" text={message || "Your Live Drop account is active. Sign in to finish setting it up."} />
          <ButtonLink href="/login" size="lg" className="w-full">
            Sign in
          </ButtonLink>
        </>
      )}

      {(status === "error" || status === "manual") && (
        <>
          {status === "error" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-tint text-brand grid place-items-center mb-6">
                <IconAlert size={22} />
              </div>
              <AuthHeading title="That link has expired" text={message || "This verification link is invalid, expired, or already used. Get a fresh one below."} />
            </>
          ) : (
            <AuthHeading title="Verify your account" text="Enter your email address and we'll send a fresh verification link." />
          )}
          <form onSubmit={handleResend} className="space-y-4">
            {resendStatus && <Notice tone="neutral">{resendStatus}</Notice>}
            <Field label="Email">
              <Input id="resend-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Button type="submit" disabled={resending} size="lg" className="w-full">
              {resending ? "Sending link…" : "Send verification link"}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
