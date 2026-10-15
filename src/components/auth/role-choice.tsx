"use client";

import { IconBag, IconBroadcast } from "@/components/ui/icons";
import { cx } from "@/components/ui/kit";

type Role = "seller" | "buyer";

const OPTIONS: { value: Role; title: string; text: string; icon: React.ReactNode }[] = [
  { value: "seller", title: "I want to sell", text: "Go live, say the price, get paid with PayPal.", icon: <IconBroadcast size={20} /> },
  { value: "buyer", title: "I want to shop", text: "Join live shows, claim items, send an AI agent.", icon: <IconBag size={20} /> },
];

// Seller or buyer: picked once, at sign-up (or in onboarding after Google sign-in).
export default function RoleChoice({ value, onChange, compact }: { value: Role | null; onChange: (r: Role) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
      {OPTIONS.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "text-left rounded-[8px] p-4 transition-shadow",
              on ? "bg-tint shadow-[inset_0_0_0_1.5px_var(--ember)]" : "bg-paper shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)]",
            )}
          >
            <span className={cx("block mb-3", on ? "text-ember" : "text-muted")}>{o.icon}</span>
            <span className="block text-sm font-medium">{o.title}</span>
            {!compact && <span className="block text-xs text-muted mt-1 leading-relaxed">{o.text}</span>}
          </button>
        );
      })}
    </div>
  );
}
