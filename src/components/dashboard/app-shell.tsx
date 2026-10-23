"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/brand/brand-logo";
import LogoutButton from "@/components/dashboard/logout-button";
import { IconAgent, IconBroadcast, IconChart, IconHome, IconReceipt, IconSearch, IconUser } from "@/components/ui/icons";
import { cx } from "@/components/ui/kit";

type Role = "seller" | "buyer";

const NAV: Record<Role, { href: string; label: string; icon: React.ComponentType<{ size?: number }> }[]> = {
  seller: [
    { href: "/dashboard", label: "Overview", icon: IconHome },
    { href: "/dashboard/shows", label: "Shows", icon: IconBroadcast },
    { href: "/dashboard/orders", label: "Orders", icon: IconReceipt },
    { href: "/dashboard/insights", label: "Insights", icon: IconChart },
    { href: "/dashboard/profile", label: "Profile & shop", icon: IconUser },
  ],
  buyer: [
    { href: "/dashboard", label: "Overview", icon: IconHome },
    { href: "/dashboard/browse", label: "Live shows", icon: IconSearch },
    { href: "/dashboard/orders", label: "Bag & orders", icon: IconReceipt },
    { href: "/dashboard/agent", label: "AI agent", icon: IconAgent },
    { href: "/dashboard/profile", label: "Profile", icon: IconUser },
  ],
};

export default function AppShell({ role, user, children }: { role: Role; user: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const items = NAV[role];
  const active = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen bg-paper border-r border-line">
        <div className="h-16 px-6 flex items-center">
          <BrandLogo size="sm" />
        </div>
        <p className="px-6 mt-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{role === "seller" ? "Seller" : "Buyer"}</p>
        <nav className="px-3 space-y-0.5" aria-label="Dashboard">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 h-10 px-3 rounded-[6px] text-sm transition-colors",
                active(href) ? "bg-tint text-ink font-medium" : "text-ink-soft hover:bg-canvas",
              )}
            >
              <span className={active(href) ? "text-brand" : "text-muted"}>
                <Icon size={18} />
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-line">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
          <LogoutButton className="mt-3 w-full" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-paper/95 backdrop-blur border-b border-line">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{role}</span>
          <LogoutButton compact />
        </div>
      </header>

      <main className="min-w-0 px-4 sm:px-8 lg:px-12 pt-8 pb-28 lg:pb-16">
        {/* Pages with a [data-wide] element (the Insights dashboards) get the full width. */}
        <div className="max-w-[1080px] has-[[data-wide]]:max-w-[1600px] mx-auto">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-line grid grid-cols-5" aria-label="Dashboard">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cx("h-16 flex flex-col items-center justify-center gap-1 text-[10.5px]", active(href) ? "text-brand font-medium" : "text-muted")}
          >
            <Icon size={20} />
            <span className="truncate max-w-full px-1">{label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="shrink-0 rounded-full bg-tint text-brand font-semibold grid place-items-center"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
