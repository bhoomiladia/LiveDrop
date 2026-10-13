import "server-only";

// Channel3: search a large catalog of products sold in online stores.
// We use it to show what similar NEW items cost, so viewers can see the deal
// and (later) agents can judge whether a price is good.

const ENDPOINT = "https://api.trychannel3.com/v1/search";

type Offer = {
  url: string;
  domain: string;
  price: { price: number; compare_at_price: number | null; currency: string };
  availability: string;
  condition: string;
};
type Product = { id: string; title: string; brands?: { name: string }[]; offers?: Offer[] };

export type RetailSource = { title: string; brand: string | null; store: string; price_cents: number };
// anchor_cents: a conservative "new" price. Search results range from budget to luxury,
// so we use the 25th percentile: a quarter of similar new items cost less. That keeps
// "you save X%" honest instead of comparing against designer prices.
export type RetailComparison = { anchor_cents: number; low_cents: number; high_cents: number; count: number; sources: RetailSource[] };

export function channel3Enabled(): boolean {
  return Boolean(process.env.CHANNEL3_API_KEY);
}

export async function findRetailPrices(query: string): Promise<RetailComparison | null> {
  if (!channel3Enabled() || !query.trim()) return null;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "x-api-key": process.env.CHANNEL3_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.slice(0, 200), limit: 20 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Channel3 ${res.status}`);
  const body = (await res.json()) as { products?: Product[] };

  // One price per product: its cheapest new, in-stock USD offer.
  const sources: RetailSource[] = [];
  for (const p of body.products ?? []) {
    const offers = (p.offers ?? []).filter(
      (o) => o.price?.currency === "USD" && o.condition === "new" && o.availability === "InStock" && o.price.price > 0,
    );
    if (!offers.length) continue;
    const best = offers.reduce((a, b) => (b.price.price < a.price.price ? b : a));
    sources.push({
      title: p.title,
      brand: p.brands?.[0]?.name ?? null,
      store: best.domain,
      price_cents: Math.round(best.price.price * 100),
    });
  }
  if (sources.length < 4) return null; // too little to say anything honest

  sources.sort((a, b) => a.price_cents - b.price_cents);
  const at = (q: number) => sources[Math.floor(q * (sources.length - 1))];
  // Show the seller a spread: cheapest, around the anchor, middle, and the top end.
  const sample = [...new Set([at(0), at(0.25), at(0.5), at(0.75), at(1)])];
  return {
    anchor_cents: at(0.25).price_cents,
    low_cents: sources[0].price_cents,
    high_cents: sources[sources.length - 1].price_cents,
    count: sources.length,
    sources: sample,
  };
}
