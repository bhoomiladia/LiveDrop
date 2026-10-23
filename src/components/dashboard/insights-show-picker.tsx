"use client";

import { useRouter } from "next/navigation";
import { cx, inputClass } from "@/components/ui/kit";

export type PickerShow = { id: string; title: string; status: string; at: number };

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

// Which show the Show Producer's PayPal tools act on. Dated, since sellers often reuse a show title.
export default function InsightsShowPicker({ shows, selectedId, className }: { shows: PickerShow[]; selectedId: string; className?: string }) {
  const router = useRouter();
  return (
    <label className={cx("flex items-center gap-2 text-[12.5px]", className)}>
      <span className="text-muted shrink-0">Acting on</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`/dashboard/insights?show=${e.target.value}`)}
        className={cx(inputClass, "h-8 w-52 pr-7 text-[13px] cursor-pointer")}
      >
        {shows.map((s) => (
          <option key={s.id} value={s.id}>
            {s.status === "live" ? "● Live · " : ""}
            {s.title} · {day.format(s.at)}
          </option>
        ))}
      </select>
    </label>
  );
}
