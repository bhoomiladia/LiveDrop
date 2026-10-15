"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the server page every so often, e.g. so "Live now" stays current.
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
