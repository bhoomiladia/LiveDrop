"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
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
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0c0e13] hover:bg-[#f4f7fd] rounded-lg border border-[#0c0e13]/12 hover:border-[#0c0e13]/25 transition-all disabled:opacity-50"
    >
      {loggingOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}
