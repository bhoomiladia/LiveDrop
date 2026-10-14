"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ControlData } from "@/lib/control-data";

// AG Studio is a browser-only component, so it's loaded on the client only.
const StudioSurface = dynamic(() => import("./studio-surface"), {
  ssr: false,
  loading: () => <div className="h-full grid place-items-center text-black/40">Loading the control room…</div>,
});

export default function ControlRoom(props: { showId: string; showTitle: string; data: ControlData; licenseKey?: string; aiEnabled: boolean }) {
  return (
    <div className="h-screen flex flex-col bg-[#f6f7fb] text-[#0b0d12]">
      <header className="h-14 px-4 md:px-6 flex items-center justify-between bg-white border-b border-black/5 gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/studio" className="font-extrabold shrink-0">🔴 Live Drop</Link>
          <span className="text-black/30">/</span>
          <Link href={`/studio/${props.showId}`} className="text-sm text-black/60 hover:text-black truncate">{props.showTitle}</Link>
          <span className="text-black/30">/</span>
          <span className="text-sm font-semibold">📊 Control room</span>
        </div>
        <span className="hidden md:inline text-xs text-black/40">Dashboards by AG Studio · Show Producer runs on Gemini · PayPal sandbox</span>
      </header>
      <div className="flex-1 min-h-0">
        <StudioSurface {...props} />
      </div>
    </div>
  );
}
