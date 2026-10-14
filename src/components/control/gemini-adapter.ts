"use client";

import type { AgAiEvent, AgAiOutputItem, AgLlmAdapter, AgLlmRequest, AgLlmResponse } from "ag-studio";

// Browser half of the AG Studio <-> Gemini adapter (server half: src/lib/studio-ai.ts).
// Each turn goes to our own /api/studio-ai/turn route, which holds the Gemini key; the answer
// is replayed to AG Studio as the event stream its agent framework expects.

type TurnResult = {
  text: string;
  toolCalls: { callId: string; name: string; arguments: string }[];
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
};

let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export function geminiAdapter(endpoint = "/api/studio-ai/turn"): AgLlmAdapter {
  return {
    executeTurn(request: AgLlmRequest, options?: { signal?: AbortSignal }) {
      let resolveComplete!: (r: AgLlmResponse) => void;
      let rejectComplete!: (e: Error) => void;
      const complete = new Promise<AgLlmResponse>((resolve, reject) => {
        resolveComplete = resolve;
        rejectComplete = reject;
      });
      // The rejection is observed through `complete`; this stops an "unhandled" warning when
      // a consumer abandons the stream first.
      void complete.catch(() => {});

      async function* events(): AsyncIterableIterator<AgAiEvent> {
        let result: TurnResult;
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
            signal: options?.signal,
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || `AI request failed (${res.status})`);
          result = body;
        } catch (err) {
          rejectComplete(err instanceof Error ? err : new Error(String(err)));
          return;
        }

        const output: AgAiOutputItem[] = [];
        if (result.text) {
          const messageId = newId("msg");
          yield { type: "TEXT_MESSAGE_START", messageId, role: "assistant" };
          yield { type: "TEXT_MESSAGE_CONTENT", messageId, delta: result.text };
          yield { type: "TEXT_MESSAGE_END", messageId };
          output.push({
            id: messageId,
            kind: "output",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "text", text: result.text, annotations: [] }],
          });
        }
        for (const call of result.toolCalls) {
          yield { type: "TOOL_CALL_START", toolCallId: call.callId, toolCallName: call.name };
          yield { type: "TOOL_CALL_ARGS", toolCallId: call.callId, delta: call.arguments };
          yield { type: "TOOL_CALL_END", toolCallId: call.callId };
          output.push({ id: newId("fc"), kind: "output", type: "function_call", callId: call.callId, name: call.name, arguments: call.arguments, status: "completed" });
        }
        resolveComplete({
          id: newId("resp"),
          createdAt: Date.now(),
          output,
          status: "completed",
          model: result.model,
          usage: result.usage ? { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens } : undefined,
        } as AgLlmResponse);
      }

      const iterator = events();
      return { stream: { [Symbol.asyncIterator]: () => iterator }, complete };
    },
  };
}
