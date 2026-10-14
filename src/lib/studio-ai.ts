import "server-only";
import crypto from "node:crypto";
import { GoogleGenAI, FunctionCallingConfigMode, type Content, type Part, type FunctionDeclaration } from "@google/genai";
import type { AgLlmRequest, AgAiConversationItem, AgAiToolCall } from "ag-studio";
import { aiModels } from "./gemini";

// Server half of the AG Studio <-> Gemini adapter. AG Studio's agent framework speaks an
// OpenAI-Responses-like protocol; this turns one turn of it into a Gemini function-calling
// request, and Gemini's answer back into text and tool calls. The browser half lives in
// src/components/control/gemini-adapter.ts. The API key never leaves the server.

export type StudioTurnResult = {
  text: string;
  toolCalls: { callId: string; name: string; arguments: string }[];
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
};

// Gemini 3 models sign their function calls ("thought signatures") and expect the signature
// back when the conversation continues. AG Studio's tool-call items have no field for it, so
// we remember it here by call id. One server process serves the demo, so memory is enough.
const signatures = (globalThis as unknown as { __studioSigs?: Map<string, { sig: string; model: string; at: number }> });
signatures.__studioSigs ??= new Map();
const sigs = signatures.__studioSigs;
const SKIP_SIGNATURE = "skip_thought_signature_validator"; // documented placeholder when no signature is available

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

const containsRef = (v: unknown): boolean =>
  Array.isArray(v) ? v.some(containsRef) : !!v && typeof v === "object" && Object.entries(v).some(([k, x]) => k === "$ref" || containsRef(x));

// Gemini accepts a JSON-Schema subset. Two fixes make AG Studio's tool schemas acceptable:
//  - drop keywords it rejects;
//  - recursive schemas ($ref loops, e.g. "a column can contain columns") must be optional for
//    Gemini, so any required property that leads to a $ref becomes optional. The model can still
//    fill it in; it just isn't forced to recurse forever.
function cleanSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(cleanSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "$schema" || k === "$id" || k === "examples") continue;
    out[k] = cleanSchema(v);
  }
  const props = out.properties as Record<string, unknown> | undefined;
  if (props && Array.isArray(out.required)) {
    const required = (out.required as string[]).filter((name) => !containsRef(props[name]));
    if (required.length) out.required = required;
    else delete out.required;
  }
  return out;
}

// Free-tier rate limits: a model that just said "too many requests" (429) is skipped for a minute,
// so the next turns go straight to a model that still has quota.
const cooling = (globalThis as unknown as { __studioCooling?: Map<string, number> });
cooling.__studioCooling ??= new Map();
const coolingUntil = cooling.__studioCooling;

function toContents(input: AgAiConversationItem[], model: string): { contents: Content[]; system: string[] } {
  const system: string[] = [];
  const contents: Content[] = [];
  const namesByCall = new Map<string, string>();
  const push = (role: "user" | "model", part: Part) => {
    const last = contents.at(-1);
    if (last && last.role === role) last.parts!.push(part);
    else contents.push({ role, parts: [part] });
  };

  for (const item of input) {
    if (item.type === "message" && item.kind === "input") {
      const text = item.content.map((c) => (c.type === "text" ? c.text : "")).filter(Boolean).join("\n");
      if (!text) continue;
      if (item.role === "system") system.push(text);
      else push("user", { text });
    } else if (item.type === "message") {
      const text = item.content.map((c) => (c.type === "text" ? c.text : c.refusal)).join("\n");
      if (text) push("model", { text });
    } else if (item.type === "function_call") {
      const call = item as AgAiToolCall;
      namesByCall.set(call.callId, call.name);
      let args: Record<string, unknown> = {};
      try {
        args = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {}
      const saved = sigs.get(call.callId);
      push("model", {
        functionCall: { name: call.name, args, id: call.callId },
        thoughtSignature: saved && saved.model === model ? saved.sig : SKIP_SIGNATURE,
      });
    } else if (item.type === "function_call_output") {
      let output: unknown = item.output;
      try {
        output = JSON.parse(item.output);
      } catch {}
      push("user", {
        functionResponse: { name: namesByCall.get(item.callId) ?? "tool", id: item.callId, response: { output } },
      });
    }
    // Reasoning items are Gemini-internal; nothing to send back.
  }
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "Hello" }] });
  return { contents, system };
}

export async function runStudioTurn(request: AgLlmRequest, signal?: AbortSignal): Promise<StudioTurnResult> {
  const tools = (request.tools ?? []).filter((t) => t.kind !== "provided");
  const declarations: FunctionDeclaration[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: cleanSchema(t.parameters),
  }));
  const choice = request.toolChoice;
  const mode =
    choice === "none" ? FunctionCallingConfigMode.NONE : choice === "required" || typeof choice === "object" ? FunctionCallingConfigMode.ANY : FunctionCallingConfigMode.AUTO;
  const allowed = typeof choice === "object" && choice && "name" in choice ? [String((choice as { name: string }).name)] : undefined;
  const wantsJson = request.responseFormat?.type === "json";

  let lastError: unknown;
  const now = Date.now();
  const available = aiModels().filter((m) => (coolingUntil.get(m) ?? 0) < now);
  for (const model of available.length ? available : aiModels()) {
    const { contents, system } = toContents(request.input, model);
    if (request.instructions) system.unshift(request.instructions);
    // Gemini can't combine function calling with a JSON response format: ask for JSON in words instead.
    const jsonViaPrompt = wantsJson && declarations.length > 0;
    if (jsonViaPrompt && request.responseFormat.type === "json") {
      system.push(`When you give your final answer, reply with JSON only, matching this schema: ${JSON.stringify(request.responseFormat.schema)}`);
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await ai().models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system.join("\n\n") || undefined,
          ...(declarations.length
            ? { tools: [{ functionDeclarations: declarations }], toolConfig: { functionCallingConfig: { mode, allowedFunctionNames: allowed } } }
            : {}),
          ...(wantsJson && !jsonViaPrompt && request.responseFormat.type === "json"
            ? { responseMimeType: "application/json", responseJsonSchema: cleanSchema(request.responseFormat.schema) }
            : {}),
          abortSignal: controller.signal,
        },
      });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join("");
      const toolCalls = parts
        .filter((p) => p.functionCall?.name)
        .map((p) => {
          const callId = p.functionCall!.id || `call_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
          if (p.thoughtSignature) sigs.set(callId, { sig: p.thoughtSignature, model, at: Date.now() });
          return { callId, name: p.functionCall!.name!, arguments: JSON.stringify(p.functionCall!.args ?? {}) };
        });
      pruneSignatures();
      return {
        text,
        toolCalls,
        model,
        usage: res.usageMetadata
          ? { inputTokens: res.usageMetadata.promptTokenCount ?? 0, outputTokens: res.usageMetadata.candidatesTokenCount ?? 0 }
          : undefined,
      };
    } catch (err) {
      lastError = err;
      if (signal?.aborted) break;
      const status = (err as { status?: number }).status;
      console.warn(`[studio-ai] ${model} failed`, status ?? (err as Error).message);
      if (status === 429) coolingUntil.set(model, Date.now() + 60_000);
      // A request Gemini rejects as invalid (400) won't work on another model either.
      if (status === 400) break;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The AI is busy right now. Please try again.");
}

function pruneSignatures() {
  const cutoff = Date.now() - 2 * 3_600_000;
  for (const [k, v] of sigs) if (v.at < cutoff) sigs.delete(k);
}
