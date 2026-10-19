// Shared building blocks for the app, styled after the landing page (brand palette, 5px buttons,
// uppercase kickers, hairline borders). No hooks, so they work in server and client components.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ----------------------------------------------------------------- buttons

type Variant = "primary" | "secondary" | "ghost" | "brand" | "live" | "accent" | "danger" | "paypal";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-soft",
  secondary: "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)]",
  ghost: "text-ink hover:bg-tint",
  brand: "bg-brand text-paper hover:bg-[#1f4cc0]",
  live: "bg-live text-paper hover:bg-[#bf3a33]",
  accent: "bg-accent text-ink shadow-[inset_0_-1px_0_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.14)]",
  danger: "text-live shadow-[inset_0_0_0_1px_#f3c5c1] hover:bg-live-tint",
  paypal: "bg-paypal text-ink hover:brightness-95",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center rounded-[5px] font-medium tracking-[-0.01em] whitespace-nowrap transition-colors active:scale-[.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({ variant, size, className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

// ----------------------------------------------------------------- form fields

export const inputClass =
  "w-full h-10 px-3 rounded-[6px] bg-paper text-sm text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow placeholder:text-muted/70 hover:shadow-[inset_0_0_0_1px_#b4bdcc] focus:shadow-[inset_0_0_0_1.5px_var(--brand),0_0_0_4px_rgba(38,89,217,.14)] disabled:bg-canvas disabled:text-muted";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto py-2.5 leading-relaxed", className)} {...rest} />;
}

// Demo video helper, only under `npm run dev`: types `text` into a box letter by letter through its state setter.
export function typeDemo(text: string | undefined, set: (value: string) => void) {
  if (process.env.NODE_ENV !== "development" || !text) return;
  for (let i = 1; i <= text.length; i++) setTimeout(() => set(text.slice(0, i)), i * 35);
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(inputClass, "pr-8 cursor-pointer", className)} {...rest} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="block text-[13px] font-medium text-ink mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1.5 leading-relaxed">{hint}</span>}
    </label>
  );
}

// ----------------------------------------------------------------- surfaces and text

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("bg-paper rounded-[10px] border border-line", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="text-[13px] text-muted mt-1 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand", className)}>{children}</span>;
}

export function PageHeader({ kicker, title, description, actions }: { kicker?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1 className="mt-1.5 text-[30px] sm:text-[36px] font-[450] tracking-[-0.035em] leading-[1.05]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[15px] text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "brand" | "live" | "success" | "warn" | "outline";
const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]",
  brand: "bg-tint text-brand",
  live: "bg-live text-paper",
  success: "bg-success-tint text-success",
  warn: "bg-warn-tint text-warn",
  outline: "text-muted shadow-[inset_0_0_0_1px_var(--line-strong)]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 h-[22px] px-2 rounded-[4px] text-[11.5px] font-medium whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[4px] bg-live text-paper text-[11px] font-semibold tracking-[0.08em]", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-paper animate-pulse" />
      LIVE
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-[28px] font-[450] tracking-[-0.03em] leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-4 w-11 h-11 rounded-full bg-tint text-brand grid place-items-center">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1.5 text-sm text-muted max-w-sm mx-auto leading-relaxed">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "error" | "success" | "brand"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-canvas text-ink-soft border-line",
    error: "bg-live-tint text-[#a8322b] border-[#f3c5c1]",
    success: "bg-success-tint text-success border-[#cfe6d7]",
    brand: "bg-tint text-ink border-brand-light",
  };
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cx("rounded-[8px] border px-3.5 py-3 text-[13px] leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

export function Thumb({ src, className, alt = "" }: { src: string | null | undefined; className?: string; alt?: string }) {
  return (
    <div className={cx("bg-canvas border border-line rounded-[8px] overflow-hidden shrink-0 grid place-items-center text-muted/60", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M5 8h14l-1 12H6z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
      )}
    </div>
  );
}

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export function timeAgo(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86_400);
  return d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
