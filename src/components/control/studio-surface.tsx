"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgStudioAiModule, type AgStudioApi, type AgStudioMode } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { ControlData } from "@/lib/control-data";
import { buttonClass } from "@/components/ui/kit";
import { buildShowProducer } from "./show-producer";
import { buildStudioData, controlReport, PAGE_TITLES } from "./studio-config";

export default function StudioSurface({
  showId,
  data,
  licenseKey,
  aiEnabled,
}: {
  showId: string;
  data: ControlData;
  licenseKey?: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const apiRef = useRef<AgStudioApi | null>(null);
  const [mode, setMode] = useState<AgStudioMode>("view");
  const [pageId, setPageId] = useState(controlReport.selectedPageId ?? "recap");
  const [refreshing, setRefreshing] = useState(false);

  const studioData = useMemo(() => buildStudioData(data), [data]);
  // Re-reads the seller's data from the server after the Show Producer changes something.
  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1200);
  };
  const ai = useMemo(() => (aiEnabled ? buildShowProducer(showId, () => router.refresh()) : undefined), [aiEnabled, showId, router]);

  const goToPage = (id: string) => {
    const api = apiRef.current;
    if (!api) return;
    api.setState({ ...api.getState(), selectedPageId: id });
    setPageId(id);
  };

  const empty = !data.items.length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap bg-paper border-b border-line">
        {Object.entries(PAGE_TITLES).map(([id, label]) => (
          <button
            key={id}
            onClick={() => goToPage(id)}
            aria-pressed={pageId === id}
            className={`h-8 px-3 rounded-[5px] text-[13px] font-medium transition-colors ${pageId === id ? "bg-tint text-ink shadow-[inset_0_0_0_1px_var(--ember-light)]" : "text-ink-soft hover:bg-canvas"}`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={refresh} className={buttonClass("secondary", "sm")}>
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
          <button onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))} className={buttonClass(mode === "view" ? "secondary" : "primary", "sm")}>
            {mode === "view" ? "Edit layout" : "Done editing"}
          </button>
        </div>
      </div>
      {empty && (
        <p className="px-4 py-2.5 text-[13px] bg-warn-tint text-warn border-b border-line">
          No items yet. Go live and list a few, and this fills up. The Show Producer can still answer questions.
        </p>
      )}
      <div className="flex-1 min-h-0">
        <AgStudioProvider licenseKey={licenseKey} modules={ai ? [AgStudioAiModule] : undefined}>
          <AgStudio
            style={{ height: "100%", width: "100%" }}
            layout={{ widgetBorderEnabled: true }}
            data={studioData}
            ai={ai}
            initialState={controlReport}
            mode={mode}
            onApiReady={(event) => {
              apiRef.current = event.api;
            }}
            onStateUpdated={(event) => {
              if (event.state.selectedPageId && event.state.selectedPageId !== pageId) setPageId(event.state.selectedPageId);
            }}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}
