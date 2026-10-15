"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OrdersPanel from "@/components/live/orders-panel";
import { Notice, Select } from "@/components/ui/kit";

type ShowOption = { id: string; title: string; status: string };

// Show picker + the per-show orders desk (invoices, tracking, refunds).
export default function SellerOrders({ shows, selectedId }: { shows: ShowOption[]; selectedId: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="order-show" className="text-[13px] font-medium shrink-0">
          Show
        </label>
        <Select id="order-show" value={selectedId} onChange={(e) => router.push(`/dashboard/orders?show=${e.target.value}`)} className="sm:max-w-sm">
          {shows.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.status === "live" ? " (live)" : s.status === "ended" ? " (ended)" : ""}
            </option>
          ))}
        </Select>
      </div>
      {toast && <Notice tone="neutral">{toast}</Notice>}
      <OrdersPanel
        key={selectedId}
        showId={selectedId}
        refreshKey={String(tick)}
        onToast={(m) => {
          setToast(m);
          setTick((t) => t + 1);
        }}
      />
    </div>
  );
}
