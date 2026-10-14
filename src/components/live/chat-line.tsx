"use client";

import type { ChatMessage } from "./use-show";

// One chat message. Shop-assistant answers show where they came from (RAG sources);
// questions the assistant couldn't answer are flagged for the seller.
export default function ChatLine({
  m,
  replyTo,
  dark,
  onReply,
}: {
  m: ChatMessage;
  replyTo?: ChatMessage;
  dark: boolean;
  onReply?: (m: ChatMessage) => void;
}) {
  const muted = dark ? "text-white/40" : "text-black/40";

  if (m.kind === "answer" || m.kind === "seller") {
    const assistant = m.kind === "answer";
    return (
      <div
        className={`rounded-xl px-2.5 py-1.5 ${
          assistant ? (dark ? "bg-violet-500/20" : "bg-violet-50") : dark ? "bg-amber-400/20" : "bg-amber-50"
        }`}
      >
        {replyTo && (
          <p className={`text-[11px] ${muted} truncate`}>
            ↳ {replyTo.name}: {replyTo.text}
          </p>
        )}
        <span className={`font-semibold ${assistant ? (dark ? "text-violet-200" : "text-violet-700") : dark ? "text-amber-200" : "text-amber-700"}`}>
          {m.name}
        </span>{" "}
        <span>{m.text}</span>
        {m.sources.length > 0 && <p className={`text-[10px] ${muted} mt-0.5`}>Source: {m.sources.join(" · ")}</p>}
      </div>
    );
  }

  return (
    <div className="leading-snug">
      <span className={`font-semibold ${dark ? "text-white/70" : ""}`}>{m.name}</span>{" "}
      <span
        className={
          m.kind === "claim"
            ? dark
              ? "text-amber-300 font-semibold"
              : "text-amber-600 font-semibold"
            : m.kind === "question"
              ? dark
                ? "text-sky-300"
                : "text-blue-600"
              : dark
                ? "text-white/90"
                : ""
        }
      >
        {m.text}
      </span>
      {m.kind !== "other" && m.kind !== "pending" && <span className={`ml-1 text-[10px] uppercase ${muted}`}>{m.kind}</span>}
      {m.kind === "pending" && <span className={`ml-1 text-[10px] ${muted}`}>checking…</span>}
      {m.needs_seller && (
        <span className="ml-1.5 text-[10px] font-bold uppercase text-red-500">
          {onReply ? (
            <button onClick={() => onReply(m)} className="underline">
              needs your answer · reply
            </button>
          ) : (
            "asked the seller"
          )}
        </span>
      )}
    </div>
  );
}
