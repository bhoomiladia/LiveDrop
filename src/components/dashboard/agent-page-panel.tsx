"use client";

import { useState } from "react";
import AgentPanel from "@/components/live/agent-panel";
import { Notice } from "@/components/ui/kit";

export default function AgentPagePanel({ defaults }: { defaults: { wish?: string; sizes?: string; email?: string } }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {note && <Notice tone="brand">{note}</Notice>}
      <AgentPanel full defaults={defaults} onToast={setNote} />
    </div>
  );
}
