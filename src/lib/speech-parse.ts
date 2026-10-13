// Instant, AI-free parsing of what a seller says while holding up an item.
// "vintage denim jacket, size medium, forty-five dollars" -> { price: 45, size: "M", title: "Vintage denim jacket" }
// Runs in milliseconds so a listing card can appear before the AI has answered.

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const SIZE_WORDS: [RegExp, string][] = [
  [/\b(?:xxl|2xl|double extra large)\b/, "XXL"],
  [/\b(?:xl|extra large)\b/, "XL"],
  [/\b(?:xs|extra small)\b/, "XS"],
  [/\bsmall\b/, "S"],
  [/\bmedium\b/, "M"],
  [/\blarge\b/, "L"],
];

export type SpokenListing = {
  price?: number;
  size?: string;
  title?: string;
};

// Turns a run of number words ("one hundred twenty five") into a number.
function wordsToNumber(words: string[]): number | undefined {
  let total = 0;
  let current = 0;
  let seen = false;
  for (const w of words) {
    if (w in UNITS) { current += UNITS[w]; seen = true; }
    else if (w in TENS) { current += TENS[w]; seen = true; }
    else if (w === "hundred") { current = (current || 1) * 100; seen = true; }
    else if (w === "thousand") { total += (current || 1) * 1000; current = 0; seen = true; }
    else if (w === "a" || w === "and") continue;
    else return undefined;
  }
  return seen ? total + current : undefined;
}

const NUMBER_WORD = new Set([...Object.keys(UNITS), ...Object.keys(TENS), "hundred", "thousand", "a", "and"]);

// Finds a price: "$45", "45 dollars", "45 bucks", "forty-five dollars", "price is 45".
export function parsePrice(text: string): number | undefined {
  const t = text.toLowerCase().replace(/-/g, " ");

  const dollarSign = t.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (dollarSign) return Number(dollarSign[1]);

  const digitsWithUnit = t.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)\b/);
  if (digitsWithUnit) return Number(digitsWithUnit[1]);

  // Number words directly before "dollars"/"bucks".
  const tokens = t.replace(/[^a-z0-9.\s]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (!/^(?:dollars?|bucks?|usd)$/.test(tokens[i])) continue;
    let start = i;
    while (start > 0 && NUMBER_WORD.has(tokens[start - 1])) start--;
    const run = tokens.slice(start, i).filter((w) => w !== "a" || start < i - 1);
    const n = wordsToNumber(run);
    if (n !== undefined && n > 0) return n;
  }

  // "price is 45" / "for 45" / "only 45".
  const cue = t.match(/\b(?:price(?: is)?|for|only|just)\s+(\d+(?:\.\d{1,2})?)\b/);
  if (cue) return Number(cue[1]);

  return undefined;
}

export function parseSize(text: string): string | undefined {
  const t = text.toLowerCase();
  const numeric = t.match(/\bsize\s+(\d{1,2}(?:\.5)?)\b/);
  if (numeric) return numeric[1];
  const lettered = t.match(/\bsize\s+(xxl|xl|xs|s|m|l)\b/);
  if (lettered) return lettered[1].toUpperCase();
  for (const [re, size] of SIZE_WORDS) if (re.test(t)) return size;
  return undefined;
}

const FILLERS = /^(?:ok(?:ay)?|alright|so|next(?: one)?|next up|this(?: one)? is|here(?:'s| is| we have)|we(?: have|'ve got)|um+|uh+|and|now)[\s,.!-]+/i;

// A rough title: the words before the first mention of size or price.
export function parseTitle(text: string): string | undefined {
  let t = text.trim();
  for (let i = 0; i < 4; i++) t = t.replace(FILLERS, "");
  const cut = t.search(/,|\bsize\b|\$|\b\d|\b(?:for|only|just|price)\b|\b(?:small|medium|large|xs|xl|xxl)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/i);
  const head = (cut > 0 ? t.slice(0, cut) : t).replace(/[\s,.!-]+$/, "").trim();
  if (!head || head.split(/\s+/).length > 8) return undefined;
  return head.charAt(0).toUpperCase() + head.slice(1);
}

export function parseSpokenListing(text: string): SpokenListing {
  return { price: parsePrice(text), size: parseSize(text), title: parseTitle(text) };
}
