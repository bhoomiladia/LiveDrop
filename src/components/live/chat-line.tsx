"use client";

import { cx } from "@/components/ui/kit";
import type { ChatMessage } from "./use-show";

// One chat message. Shop-assistant answers show where they came from (RAG sources);
// questions the assistant couldn't answer are flagged for the seller.
export default function ChatLine({ m, replyTo, onReply }: { m: ChatMessage; replyTo?: ChatMessage; onReply?: (m: ChatMessage) => void }) {
  if (m.kind === "answer" || m.kind === "seller") {
    const assistant = m.kind === "answer";
    return (
      <div className={cx("rounded-[8px] px-3 py-2", assistant ? "bg-canvas shadow-[inset_0_0_0_1px_var(--line)]" : "bg-tint")}>
        {replyTo && (
          <p className="text-[11px] text-muted truncate mb-0.5">
            Replying to {replyTo.name}: {replyTo.text}
          </p>
        )}
        <span className={cx("font-medium", assistant ? "text-ink" : "text-brand")}>{m.name}</span>
        {!assistant && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand">Seller</span>}{" "}
        <span>{m.text}</span>
        {m.sources.length > 0 && <p className="text-[11px] text-muted mt-1">Source: {m.sources.join(" · ")}</p>}
      </div>
    );
  }

  return (
    <div className="leading-snug px-1">
      <span className="font-medium">{m.name}</span>{" "}
      <span className={m.kind === "claim" ? "text-brand font-medium" : m.kind === "bid" ? "font-medium" : "text-ink-soft"}>{m.text}</span>
      {(m.kind === "claim" || m.kind === "bid" || m.kind === "question") && (
        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{m.kind}</span>
      )}
      {m.kind === "pending" && <span className="ml-1.5 text-[11px] text-muted">checking…</span>}
      {m.needs_seller &&
        (onReply ? (
          <button onClick={() => onReply(m)} className="ml-1.5 text-[11px] font-semibold text-brand underline underline-offset-2">
            Needs your answer · Reply
          </button>
        ) : (
          <span className="ml-1.5 text-[11px] text-muted">asked the seller</span>
        ))}
    </div>
  );
}
