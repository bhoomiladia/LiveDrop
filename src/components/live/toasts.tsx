"use client";

import { IconCheck } from "@/components/ui/icons";
import { cx } from "@/components/ui/kit";
import type { Toast } from "./use-show";

export default function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2 z-50 w-[min(92vw,420px)]" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-[8px] px-4 py-3 text-sm font-medium shadow-[0_12px_32px_-12px_rgba(20,12,9,.45)] flex items-center gap-2.5",
            t.tone === "paid" ? "bg-success text-paper" : t.tone === "claim" ? "bg-brand text-paper" : "bg-ink text-paper",
          )}
        >
          {t.tone === "paid" && <IconCheck size={16} className="shrink-0" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
