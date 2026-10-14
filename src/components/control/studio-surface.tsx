"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgStudioAiModule, type AgStudioApi, type AgStudioMode } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import type { ControlData } from "@/lib/control-data";
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
      <div className="px-4 md:px-6 py-2 flex items-center gap-2 flex-wrap bg-white border-b border-black/5">
        {Object.entries(PAGE_TITLES).map(([id, label]) => (
          <button
            key={id}
            onClick={() => goToPage(id)}
            className={`h-8 px-3 rounded-full text-sm font-semibold ${pageId === id ? "bg-black text-white" : "bg-black/5 text-black/70"}`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={refresh} className="h-8 px-3 rounded-full border border-black/10 text-sm">
            {refreshing ? "Refreshing…" : "↻ Refresh data"}
          </button>
          <button onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))} className="h-8 px-3 rounded-full border border-black/10 text-sm">
            {mode === "view" ? "✏️ Edit layout" : "✓ Done editing"}
          </button>
        </div>
      </div>
      {empty && (
        <p className="px-6 py-2 text-sm bg-amber-50 text-amber-800">
          No items yet. Go live and list a few, and this fills up. (The Show Producer can still answer questions.)
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
