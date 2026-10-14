import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { publish, viewerCount } from "./events";
import { addRetailPrices, createShow, getItem, getShow, goLive, postMessage, setShowStatus, startAuction, toPublicItem, type ShowRow } from "./live";
import { getShopInfo, indexItem, saveShopInfo } from "./rag";

// Judge mode: an always-on demo show so judges can try Live Drop in two minutes without
// going live themselves. A "director" plays the seller (a new item every ~45s, a flash
// auction now and then) and three simulated viewers chat, ask questions and sometimes claim.
// The simulated viewers never pay, so items pass to real visitors, who pay with PayPal sandbox.
// To save the free AI quota, the director only works while someone is watching.

export const DEMO_SELLER = { id: "demo-seller", name: "Rosa", email: "demo-seller@livedrop.demo" };
const DEMO_TITLE = "Live Drop demo · Rosa's vintage finds";
const LIST_EVERY_MS = 45_000;
const IDLE_PAUSE_MS = 2 * 60_000;

export function judgeModeEnabled(): boolean {
  return process.env.JUDGE_MODE !== "off";
}

type CatalogItem = { key: string; title: string; size: string | null; condition: string; category: string; description: string; price: number; image: string };

// Photos: public/demo (CC0 / public domain, no brand names; see public/demo/CREDITS.md).
const CATALOG: CatalogItem[] = [
  { key: "jacket", title: "Vintage Denim Jacket", size: "M", condition: "good", category: "Jackets", description: "Classic light-wash trucker jacket, soft from years of wear.", price: 45, image: "/demo/jacket.jpg" },
  { key: "cap", title: "Navy Baseball Cap", size: null, condition: "like new", category: "Hats", description: "Clean six-panel cap with an adjustable strap.", price: 14, image: "/demo/cap.jpg" },
  { key: "boots", title: "White Leather Heeled Boots", size: "8", condition: "good", category: "Shoes", description: "Knee-high white boots with a 6 cm heel. Statement piece.", price: 38, image: "/demo/boots.jpg" },
  { key: "cardigan", title: "Brown Wool Cardigan", size: "L", condition: "good", category: "Sweaters", description: "Heavy knit cardigan with four button pockets.", price: 32, image: "/demo/cardigan.jpg" },
  { key: "sunglasses", title: "Heart-Shaped Sunglasses", size: null, condition: "like new", category: "Accessories", description: "Rimless rose-tinted heart lenses. Pure fun.", price: 12, image: "/demo/sunglasses.jpg" },
  { key: "flannel", title: "Olive Flannel Shirt", size: "M", condition: "good", category: "Shirts", description: "Warm olive flannel with two chest pockets.", price: 22, image: "/demo/flannel.jpg" },
  { key: "beanie", title: "Cat-Ear Knit Beanie", size: null, condition: "new", category: "Hats", description: "Black beanie with striped cat ears.", price: 16, image: "/demo/beanie.jpg" },
  { key: "scarf", title: "Embroidered Linen Scarf", size: null, condition: "good", category: "Scarves", description: "Long cream scarf with hand-embroidered corners.", price: 28, image: "/demo/scarf.jpg" },
];

const BOTS = [
  { id: "demo-bot-ava", name: "Ava" },
  { id: "demo-bot-leo", name: "Leo" },
  { id: "demo-bot-sam", name: "Sam" },
];
const QUESTIONS = ["do you ship to canada?", "is it true to size?", "can I return it if it doesn't fit?", "how long does shipping take?"];
const CHATTER = ["love this one 😍", "what a find", "hi from Ohio!", "that color tho"];

const SHOP_INFO = {
  shipping:
    "We ship to the US and Canada. US shipping is a flat 5 USD per show and takes 3 to 5 business days. Shipping to Canada costs 15 USD and takes 5 to 8 business days.",
  returns: "Returns are accepted within 14 days if the item is unworn. The buyer pays return shipping. Flash auction items are final sale.",
  sizing: "Vintage sizes run small, so size up if you are between sizes. Measurements are available on request in chat.",
  other: "Everything is hand-picked vintage, cleaned and checked before it ships. This is a demo shop on the PayPal sandbox: no real money.",
};

type DirectorState = { showId: string; next: number; lastListedAt: number; lastWatchedAt: number; timer?: NodeJS.Timeout };
const g = globalThis as unknown as { __liveDropDemo?: DirectorState; __liveDropDemoTick?: () => void; __liveDropRetail?: Map<string, { hint: string | null; cents: number | null; sources: string | null }> };
g.__liveDropRetail ??= new Map();
const retailCache = g.__liveDropRetail;

function ensureSeller() {
  getDb()
    .prepare("INSERT OR IGNORE INTO users (id, name, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?)")
    .run(DEMO_SELLER.id, DEMO_SELLER.name, DEMO_SELLER.email, Date.now(), Date.now());
  if (!getShopInfo(DEMO_SELLER.id).shipping) void saveShopInfo(DEMO_SELLER.id, SHOP_INFO).catch(() => {});
}

// The current demo show: live, and started within the last 6 hours (otherwise a fresh one).
function currentDemoShow(): ShowRow {
  const show = getDb()
    .prepare("SELECT * FROM shows WHERE seller_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1")
    .get(DEMO_SELLER.id) as ShowRow | undefined;
  if (show && (show.started_at ?? 0) > Date.now() - 6 * 3_600_000) return show;
  if (show) setShowStatus(show.id, "ended");
  const fresh = createShow(DEMO_SELLER.id, DEMO_TITLE, 500, 2);
  setShowStatus(fresh.id, "live");
  return getShow(fresh.id)!;
}

// Called by the judge page and when the demo show is opened. Starts the director if needed.
export function ensureDemo(): { showId: string } | null {
  if (!judgeModeEnabled()) return null;
  ensureSeller();
  const show = currentDemoShow();
  let state = g.__liveDropDemo;
  if (!state || state.showId !== show.id) {
    const listed = (getDb().prepare("SELECT COUNT(*) AS n FROM items WHERE show_id = ? AND listed_at IS NOT NULL").get(show.id) as { n: number }).n;
    state = g.__liveDropDemo = { showId: show.id, next: listed % CATALOG.length, lastListedAt: 0, lastWatchedAt: Date.now() };
  }
  state.lastWatchedAt = Date.now();
  g.__liveDropDemoTick = tick; // latest code after dev reloads
  if (!state.timer) {
    state.timer = setInterval(() => g.__liveDropDemoTick?.(), 3_000);
    state.timer.unref?.();
  }
  return { showId: show.id };
}

export function isDemoShow(showId: string): boolean {
  return getShow(showId)?.seller_id === DEMO_SELLER.id;
}

function tick() {
  const state = g.__liveDropDemo;
  if (!state) return;
  const show = getShow(state.showId);
  if (!show || show.status !== "live") return;
  const now = Date.now();
  // The seller's own studio tab counts as a viewer too; either way, someone is looking.
  if (viewerCount(state.showId) > 0) state.lastWatchedAt = now;
  if (now - state.lastWatchedAt > IDLE_PAUSE_MS) return;
  if (now - state.lastListedAt < LIST_EVERY_MS) return;
  state.lastListedAt = now;
  const index = state.next;
  state.next = (state.next + 1) % CATALOG.length;
  void listNext(state.showId, CATALOG[index], index).catch((err) => console.error("[demo] listing failed", err));
}

async function listNext(showId: string, c: CatalogItem, index: number) {
  const db = getDb();
  const id = crypto.randomUUID();
  const seq = ((db.prepare("SELECT MAX(seq) AS m FROM items WHERE show_id = ?").get(showId) as { m: number | null }).m ?? 0) + 1;
  db.prepare(
    `INSERT INTO items (id, show_id, seq, title, size, condition, description, category, price_cents, status, transcript, image_data, ai_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 'done', ?)`,
  ).run(id, showId, seq, c.title, c.size, c.condition, c.description, c.category, c.price * 100, `${c.title}, ${c.size ? `size ${c.size}, ` : ""}${c.price} dollars`, c.image, Date.now());

  // Store prices: one real Channel3 lookup per catalog item, then reused.
  const cached = retailCache.get(c.key);
  if (cached) {
    db.prepare("UPDATE items SET retail_hint = ?, retail_cents = ?, retail_sources = ? WHERE id = ?").run(cached.hint, cached.cents, cached.sources, id);
  } else {
    await addRetailPrices(id);
    const it = getItem(id)!;
    retailCache.set(c.key, { hint: it.retail_hint, cents: it.retail_cents, sources: it.retail_sources });
  }
  publish(showId, { type: "item", item: toPublicItem(getItem(id)!), audience: "seller" });
  goLive(id);
  void indexItem(id).catch(() => {}); // lets the shop assistant answer questions about this item

  const say = (bot: (typeof BOTS)[number], text: string, delay: number) =>
    setTimeout(() => {
      if (getShow(showId)?.status === "live") postMessage(showId, bot, text);
    }, delay);
  const bot = (n: number) => BOTS[(index + n) % BOTS.length];

  if (index % 4 === 3) {
    // Every 4th item is a flash auction; two simulated bids keep it lively.
    const start = Math.max(5, Math.round(c.price * 0.6));
    setTimeout(() => startAuction(id, start * 100, 30), 4_000);
    say(bot(0), String(start), 10_000);
    say(bot(1), String(start + 3), 20_000);
    return;
  }
  say(bot(0), CHATTER[index % CHATTER.length], 3_000);
  // Every other item gets a question for the RAG shop assistant (keeps the free AI quota in check).
  if (index % 2 === 0) say(bot(1), QUESTIONS[(index / 2) % QUESTIONS.length], 7_000);
  // Some items get claimed by a simulated viewer after visitors had a fair head start.
  // They never pay, so after the 2-minute pay timer the item passes on (to you, if you're in line).
  if (index % 3 === 1) {
    setTimeout(() => {
      if (getItem(id)?.status === "listed") postMessage(showId, bot(2), ["SOLD", "mine!", "lo quiero"][index % 3]);
    }, 15_000);
  }
}
