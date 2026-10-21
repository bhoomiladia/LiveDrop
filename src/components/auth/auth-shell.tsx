"use client";

import * as React from "react";
import Link from "next/link";
import { GlyphField, PALETTES } from "@/components/ui/onward-summit-template";
import BrandLogo from "@/components/brand/brand-logo";
import { demoClick, type DemoText } from "@/components/ui/kit";

interface AuthShellProps {
  children: React.ReactNode;
  kicker: string;
  title: string;
  subtitle: string;
  navAction?: { label: string; href: string };
}

const POINTS = [
  ["Speak to list", "Hold an item up and say the price. It's listed in seconds."],
  ["First claim wins", "Viewers type SOLD. The server's clock decides, fairly."],
  ["Paid with PayPal", "One-tap checkout, invoices, tracking and refunds."],
];

// Sign-in pages: the landing page's brand palette and arrow field on a flat panel, the form on white.
export default function AuthShell({ children, kicker, title, subtitle, navAction = { label: "Create account", href: "/signup" } }: AuthShellProps) {
  const brand = PALETTES.cobalt;

  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <section className="relative hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-col justify-between overflow-hidden isolate bg-brand-deep text-paper p-12 xl:p-16">
        {/* The landing page's arrow field, covering the whole panel and dimmed so the copy stays readable. */}
        <div className="auth-glyphs absolute inset-0 z-0 opacity-30 pointer-events-none" aria-hidden="true">
          <style>{`.auth-glyphs .ows-field{position:absolute;inset:0;overflow:hidden}.auth-glyphs .ows-canvas{position:absolute;left:0;top:0;display:block;max-width:none}`}</style>
          <GlyphField mode="band" glyph="arrow" light={brand.glyphLight} dark={brand.glyphDark} reduced={false} cell={15} />
        </div>
        <BrandLogo size="md" theme="light" className="relative z-10" />
        <div className="relative z-10 max-w-[460px]">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-light">{kicker}</span>
          <h1 className="mt-3 text-[48px] xl:text-[56px] font-semibold tracking-[-0.045em] leading-[1.02]">{title}</h1>
          <p className="mt-5 text-[15px] text-paper/75 leading-relaxed">{subtitle}</p>
          <ul className="mt-10 pt-8 border-t border-paper/15 grid gap-5">
            {POINTS.map(([h, t]) => (
              <li key={h} className="grid grid-cols-[18px_1fr] gap-3">
                <svg width="14" height="12" viewBox="0 0 17 14" className="mt-1 text-brand-light" aria-hidden="true">
                  <path d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm font-medium">{h}</p>
                  <p className="text-[13px] text-paper/65 mt-0.5">{t}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-paper/60">PayPal Sandbox only. No real money moves.</p>
      </section>

      {/* Form side */}
      <section className="min-h-screen lg:min-h-0 flex flex-col">
        <header className="h-16 px-5 sm:px-10 flex items-center justify-between">
          <BrandLogo size="sm" className="lg:invisible" />
          <Link href={navAction.href} className="text-[13px] font-medium text-ink-soft hover:text-brand">
            {navAction.label}
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden mb-8">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">{kicker}</span>
              <p className="mt-2 text-[15px] text-muted leading-relaxed">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
        <footer className="px-5 sm:px-10 py-5 flex items-center justify-between text-xs text-muted">
          <span>© {new Date().getFullYear()} Live Drop · Team xcoded</span>
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
        </footer>
      </section>
    </div>
  );
}

// Shared bits for the auth forms.
export function AuthHeading({ title, text }: { title: string; text?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-[28px] font-[450] tracking-[-0.035em] leading-tight">{title}</h2>
      {text && <p className="text-sm text-muted mt-2 leading-relaxed">{text}</p>}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  demo,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle?: () => void;
  autoComplete: string;
  demo?: DemoText;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={demoClick(demo)}
        className="w-full h-10 px-3 pr-14 rounded-[6px] bg-paper text-sm text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow hover:shadow-[inset_0_0_0_1px_#b4bdcc] focus:shadow-[inset_0_0_0_1.5px_var(--brand),0_0_0_4px_rgba(38,89,217,.14)]"
      />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-ink"
        >
          {show ? "Hide" : "Show"}
        </button>
      )}
    </div>
  );
}

export function PasswordChecklist({ password }: { password: string }) {
  const rules = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.met ? "text-success" : "text-muted"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${r.met ? "bg-success" : "bg-line-strong"}`} />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export const passwordOk = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);

export function GoogleButton({ label = "Continue with Google", href = "/api/auth/google" }: { label?: string; href?: string }) {
  return (
    <a
      href={href}
      className="w-full h-10 rounded-[5px] bg-paper text-ink text-sm font-medium shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)] transition-shadow flex items-center justify-center gap-2.5"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      {label}
    </a>
  );
}

export function OrDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-line" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-paper px-3 text-xs text-muted">or</span>
      </div>
    </div>
  );
}
