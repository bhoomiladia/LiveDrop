"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/kit";

export default function LogoutButton({ className, compact }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      aria-label="Sign out"
      className={buttonClass("secondary", "sm", className)}
    >
      <IconLogout size={15} />
      {!compact && (loggingOut ? "Signing out…" : "Sign out")}
    </button>
  );
}
