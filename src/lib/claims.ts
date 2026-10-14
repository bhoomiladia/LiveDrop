// Rules-first chat classification. Obvious messages are decided here instantly;
// only messages that might be a claim in another language or phrasing go to the AI.

export type MessageKind = "claim" | "bid" | "question" | "other";
export type FastResult = { kind: MessageKind; bid?: number } | { kind: "unclear" };

const CLAIM_EXACT = /^(?:sold|sold!+|mine|mine!+|claim|claimed|dibs|me|me!+|me please|i'?ll take it|i will take it|i want it|want it|take it|yes please|yes|yess+)[\s!.🙋‍♀️🙋‍♂️🙋🙌✋👋]*$/iu;
const CLAIM_START = /^(?:sold|mine|claim|dibs)\b/i;
// Questions typed without a "?": "do you ship to canada", "how big is the medium".
const QUESTION_START = /^(?:do|does|did|is|are|can|could|what|how|when|where|which|will|would|who|why|any)\b.{6,}/i;
// Words that hint at buying intent in other languages or phrasings — worth asking the AI.
const MAYBE_CLAIM = /\b(?:quiero|lo quiero|la quiero|prends|je le prends|je la prends|nehme|ich nehme|chahiye|lena|voglio|prendo|eu quero|want|take|buy|grab|need)\b/i;
// Prompt-injection-looking text is never a claim; it's just text.
const INJECTION = /\b(?:system|ignore (?:all |your |previous )?(?:rules|instructions)|assistant:|developer mode)\b/i;

const NUMBER_WORDS: Record<string, number> = {
  ten: 10, fifteen: 15, twenty: 20, "twenty five": 25, thirty: 30, "thirty five": 35, forty: 40,
  "forty five": 45, fifty: 50, sixty: 60, seventy: 70, "seventy five": 75, eighty: 80, ninety: 90, hundred: 100, "a hundred": 100,
};

export function parseBid(text: string): number | undefined {
  const t = text.toLowerCase().replace(/-/g, " ").trim();
  const digits = t.match(/^(?:bid\s*)?\$?\s*(\d{1,5}(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)?[!.\s]*$/);
  if (digits) return Number(digits[1]);
  const phrased = t.match(/\b(?:bid|go|offer|pay)\s+\$?(\d{1,5}(?:\.\d{1,2})?)\b/);
  if (phrased) return Number(phrased[1]);
  const word = t.replace(/[!.?]/g, "").replace(/^(?:bid|i'?ll go|i'?ll pay|i'?ll do)\s+/, "").trim();
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
  return undefined;
}

export function classifyFast(text: string, mode: "fixed" | "auction"): FastResult {
  const t = text.trim();
  if (!t) return { kind: "other" };
  if (INJECTION.test(t)) return { kind: "other" };

  if (mode === "auction") {
    const bid = parseBid(t);
    if (bid !== undefined) return { kind: "bid", bid };
  }

  if (CLAIM_EXACT.test(t)) return { kind: "claim" };
  if (t.includes("?") || QUESTION_START.test(t)) return { kind: "question" };
  if (CLAIM_START.test(t) && t.length <= 40) return { kind: "claim" };
  if (MAYBE_CLAIM.test(t) && t.length <= 80) return { kind: "unclear" };
  if (mode === "auction" && /\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/i.test(t)) return { kind: "unclear" };
  return { kind: "other" };
}
