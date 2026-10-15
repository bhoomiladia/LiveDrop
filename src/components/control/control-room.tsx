"use client";

import dynamic from "next/dynamic";
import type { ControlData } from "@/lib/control-data";

// AG Studio is a browser-only component, so it's loaded on the client only.
const StudioSurface = dynamic(() => import("./studio-surface"), {
  ssr: false,
  loading: () => <div className="h-full grid place-items-center text-sm text-muted">Loading the control room…</div>,
});

// The seller's AG Studio control room: dashboards over all their shows + the Show Producer agent.
export default function ControlRoom(props: { showId: string; data: ControlData; licenseKey?: string; aiEnabled: boolean }) {
  return (
    <div className="h-[calc(100vh-260px)] min-h-[560px] rounded-[10px] border border-line bg-paper overflow-hidden">
      <StudioSurface {...props} />
    </div>
  );
}
