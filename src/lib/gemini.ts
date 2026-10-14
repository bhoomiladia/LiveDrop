import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";

// Gemini on the free tier: busy models return 503, so every call walks a chain
// of free models and gives up after a time budget. Callers must never block the
// live show on this — AI results arrive later and update the UI.

const PER_MODEL_TIMEOUT_MS = 25_000;
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest"];

export function aiModels(): string[] {
  const fromEnv = process.env.GEMINI_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_MODELS;
}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type JsonCall = {
  prompt: string;
  system?: string;
  schema: Schema;
  imageBase64?: string; // JPEG
  timeoutMs?: number; // total budget across all models
};

// Returns parsed JSON from the first model that answers, or null if none did in time.
export async function generateJson<T>(call: JsonCall): Promise<{ data: T; model: string } | null> {
  const deadline = Date.now() + (call.timeoutMs ?? 45_000);
  for (const model of aiModels()) {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) break;
    // Cap each model so one slow or stuck model can't use up the whole budget.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(remaining, PER_MODEL_TIMEOUT_MS));
    try {
      const res = await ai().models.generateContent({
        model,
        contents: [
          ...(call.imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: call.imageBase64 } }] : []),
          { text: call.prompt },
        ],
        config: {
          systemInstruction: call.system,
          responseMimeType: "application/json",
          responseSchema: call.schema,
          abortSignal: controller.signal,
        },
      });
      const text = res.text;
      if (text) return { data: JSON.parse(text) as T, model };
    } catch (err) {
      const status = (err as { status?: number }).status;
      // 503 busy / 429 quota / 404 retired model / abort: try the next model.
      if (process.env.NODE_ENV !== "production") console.warn(`[gemini] ${model} failed`, status ?? (err as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// One fixed embedding model: vectors from different models can't be compared,
// so stored vectors remember which model made them (see rag.ts).
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";
const EMBED_DIMENSIONS = 768; // smaller vectors, plenty for a shop's worth of text

// Returns one normalized vector per text, or null if the embedding service didn't answer.
export async function embed(texts: string[], kind: "document" | "query"): Promise<number[][] | null> {
  try {
    const vectors: number[][] = [];
    for (const text of texts) {
      const res = await ai().models.embedContent({
        model: EMBED_MODEL,
        contents: text.slice(0, 2000),
        config: {
          taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
          outputDimensionality: EMBED_DIMENSIONS,
          abortSignal: AbortSignal.timeout(15_000),
        },
      });
      const values = res.embeddings?.[0]?.values;
      if (!values?.length) return null;
      const norm = Math.hypot(...values) || 1;
      vectors.push(values.map((v) => v / norm));
    }
    return vectors;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[gemini] embedding failed", (err as Error).message);
    return null;
  }
}

export { Type };
