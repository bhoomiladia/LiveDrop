"use client";

import * as React from "react";
import Link from "next/link";
import { GlyphField, PALETTES } from "@/components/ui/onward-summit-template";
import BrandLogo from "@/components/brand/brand-logo";

interface AuthShellProps {
  children: React.ReactNode;
  kicker: string;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeValue?: string;
  progressPercent?: number;
  navAction?: {
    label: string;
    href: string;
  };
}

export default function AuthShell({
  children,
  kicker,
  title,
  subtitle,
  badgeLabel = "Finance Assistant",
  badgeValue = "AI Copilot Ready",
  progressPercent = 84,
  navAction = { label: "Get Started Free", href: "/signup" },
}: AuthShellProps) {
  const cobalt = PALETTES.cobalt;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0c0e13] font-sans selection:bg-[#2659d9] selection:text-white">
      {/* ---------------- Top Navbar (Matches Landing Page White Nav) ---------------- */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#0c0e13]/10 px-4 sm:px-8 h-16 flex items-center justify-between shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-6">
          <BrandLogo size="md" />
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#475569]">
          <span>Make Money Flow Smarter</span>
          <span className="opacity-40">|</span>
          <span>PayPal Ready</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={navAction.href}
            className="inline-flex items-center justify-center h-9 px-4 rounded-[5px] bg-[#e4f222] hover:bg-[#d8e61e] text-[#0c0e13] text-xs sm:text-sm font-semibold tracking-[-0.01em] transition-all shadow-[inset_0_-1px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_16px_-4px_rgba(228,242,34,0.7)]"
          >
            {navAction.label}
          </Link>
        </div>
      </header>

      {/* ---------------- Main Blue Band with Arrow Glyph Canvas Field ---------------- */}
      <section
        className="relative flex-1 flex items-center justify-center overflow-hidden isolate py-10 sm:py-16 text-white"
        style={{
          background:
            "radial-gradient(ellipse 50% 70% at 85% 50%, #2659d9 0%, transparent 100%), linear-gradient(160deg, #06174a 0%, #2659d9 100%)",
        }}
      >
        {/* Animated dynamic arrow glyph canvas from the landing page */}
        <GlyphField
          mode="band"
          glyph="arrow"
          light={cobalt.glyphLight}
          dark={cobalt.glyphDark}
          reduced={false}
          cell={15}
        />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-8 lg:gap-14 items-center">
          {/* Left Column: Huge typography and status meter */}
          <div className="max-w-[560px]">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.08em] text-[#a9c3f3]">
              {kicker}
            </span>
            <h1 className="mt-2.5 text-3xl sm:text-5xl lg:text-[58px] font-semibold tracking-[-0.045em] leading-[1.02] text-white">
              {title}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed">
              {subtitle}
            </p>

            {/* Feature metric blocks (styled exactly like the countdown/seats in the template) */}
            <div className="mt-8 pt-6 border-t border-white/15">
              <div className="flex items-center justify-between text-xs text-white/85">
                <span className="font-medium">
                  <strong className="text-white font-semibold">{badgeLabel}</strong> — {badgeValue}
                </span>
                <span className="font-medium text-[#e4f222]">{progressPercent}% automated</span>
              </div>
              <div
                className="relative mt-2.5 h-1.5 w-full rounded-full bg-white/20 overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#e4f222] transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2.5 border border-white/15 text-center">
                  <span className="block text-lg font-bold text-white tracking-tight">100%</span>
                  <span className="block text-[10px] text-white/70 uppercase tracking-wider mt-0.5">Control</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2.5 border border-white/15 text-center">
                  <span className="block text-lg font-bold text-white tracking-tight">0</span>
                  <span className="block text-[10px] text-white/70 uppercase tracking-wider mt-0.5">Hallucinations</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2.5 border border-white/15 text-center">
                  <span className="block text-lg font-bold text-white tracking-tight">256-bit</span>
                  <span className="block text-[10px] text-white/70 uppercase tracking-wider mt-0.5">Encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Crisp White Card (.ows-card) */}
          <div className="w-full">
            <div className="relative rounded-[14px] bg-white text-[#0c0e13] p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(6,23,74,0.85),0_0_0_1px_rgba(255,255,255,0.3)]">
              {children}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-white border-t border-[#0c0e13]/8 py-4 px-6 text-center text-xs text-[#686c75]">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Live Drop · Team xcoded · Sandbox only.</span>
          <div className="flex items-center gap-4 text-[#686c75]">
            <Link href="/" className="hover:text-[#0c0e13] transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-[#0c0e13] transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-[#0c0e13] transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
