"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AgStudioAiModule, type AgPanelConfig, type AgStudioApi } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import InsightsShowPicker, { type PickerShow } from "@/components/dashboard/insights-show-picker";
import { IconSpark } from "@/components/ui/icons";
import { buttonClass, cx } from "@/components/ui/kit";
import type { ControlData } from "@/lib/control-data";
import { buildShowProducer } from "./show-producer";
import { buildStudioData, controlReport, PAGE_TITLES } from "./studio-config";
import { controlTheme, producerTheme } from "./studio-theme";

// Three ways to look at the control room:
// - view: just the dashboards.
// - ask: the dashboards + the Show Producer chat on the right. AG Studio only shows its AI panel in
//   edit mode, so this is edit mode with every other editing panel hidden.
// - customize: AG Studio's full editor (fields, widgets, filters) for rearranging the dashboards.
type Surface = "view" | "ask" | "customize";
const PANELS: Record<Surface, AgPanelConfig> = {
  view: { view: {} },
  ask: { edit: { right: ["ai"] } },
  customize: { edit: { left: ["data"], right: ["edit", "filters"] } },
};

export default function StudioSurface({
  showId,
  shows,
  data,
  licenseKey,
  aiEnabled,
}: {
  showId: string;
  shows: PickerShow[];
  data: ControlData;
  licenseKey?: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const apiRef = useRef<AgStudioApi | null>(null);
  const [surface, setSurface] = useState<Surface>("view");
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
  const toggle = (s: Surface) => setSurface((current) => (current === s ? "view" : s));

  const goToPage = (id: string) => {
    const api = apiRef.current;
    if (!api) return;
    api.setState({ ...api.getState(), selectedPageId: id });
    setPageId(id);
  };

  const empty = !data.items.length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2 flex-wrap bg-paper border-b border-line">
        <div role="tablist" aria-label="Dashboards" className="flex items-center gap-0.5 p-0.5 rounded-[7px] bg-canvas shadow-[inset_0_0_0_1px_var(--line)]">
          {Object.entries(PAGE_TITLES).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              onClick={() => goToPage(id)}
              aria-selected={pageId === id}
              className={cx(
                "h-7 px-3 rounded-[5px] text-[13px] font-medium transition-colors",
                pageId === id ? "bg-paper text-ink shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(12,14,19,.06)]" : "text-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {surface === "ask" && <InsightsShowPicker shows={shows} selectedId={showId} className="mr-1.5" />}
          {surface !== "customize" && (
            <button onClick={refresh} className={buttonClass("ghost", "sm")} title="Reload the latest sales from the server">
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
          <button onClick={() => toggle("customize")} className={buttonClass(surface === "customize" ? "primary" : "ghost", "sm")}>
            {surface === "customize" ? "Done" : "Customize"}
          </button>
          {ai && surface !== "customize" && (
            <button onClick={() => toggle("ask")} aria-pressed={surface === "ask"} className={buttonClass(surface === "ask" ? "secondary" : "brand", "sm")}>
              <IconSpark size={15} />
              {surface === "ask" ? "Close Producer" : "Ask Show Producer"}
            </button>
          )}
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
            theme={surface === "ask" ? producerTheme : controlTheme}
            layout={{ widgetBorderEnabled: true, widgetBorderRadius: 12, widgetBorderColor: "#e4e8ef", widgetPadding: 14, backgroundColor: "#f6f8fc" }}
            data={studioData}
            ai={ai}
            initialState={controlReport}
            mode={surface === "view" ? "view" : "edit"}
            panels={PANELS[surface]}
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
