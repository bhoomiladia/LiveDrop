"use client";

import dynamic from "next/dynamic";
import type { PickerShow } from "@/components/dashboard/insights-show-picker";
import type { ControlData } from "@/lib/control-data";

// AG Studio is a browser-only component, so it's loaded on the client only.
const StudioSurface = dynamic(() => import("./studio-surface"), {
  ssr: false,
  loading: () => <div className="h-full grid place-items-center text-sm text-muted">Loading the control room…</div>,
});

// The seller's AG Studio control room: dashboards over all their shows + the Show Producer agent.
export default function ControlRoom(props: { showId: string; shows: PickerShow[]; data: ControlData; licenseKey?: string; aiEnabled: boolean }) {
  return (
    <div data-wide className="h-[calc(100vh-210px)] min-h-[640px] rounded-[12px] border border-line bg-canvas overflow-hidden">
      <StudioSurface {...props} />
    </div>
  );
}
