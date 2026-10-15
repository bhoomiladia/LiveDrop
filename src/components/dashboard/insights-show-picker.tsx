"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/kit";

export default function InsightsShowPicker({ shows, selectedId }: { shows: { id: string; title: string }[]; selectedId: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-muted shrink-0">Producer acts on</span>
      <Select value={selectedId} onChange={(e) => router.push(`/dashboard/insights?show=${e.target.value}`)} className="w-56">
        {shows.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </Select>
    </label>
  );
}
