import "server-only";
import { col } from "./db";
import { DEMO, demoMode, isDemoEmail, type CrowdLine } from "./demo-script";
import { publish, subscribe, viewerCount, type ShowEvent } from "./events";
import { auctionRunning, getItem, getShow, postMessage } from "./live";

// Demo video (NEXT_PUBLIC_DEMO_MODE=on), the server side of demo-script.ts:
// - Retakes: signing up again with a scripted email deletes the old demo account and everything it made.
// - A small simulated crowd in the scripted seller's shows, so the recording looks like a real live show.
//   The bots chat, claim and bid through the same code as real viewers, but only ever react to real people:
//   they claim after you and stop bidding below you, so they never take an item away.

// ----------------------------------------------------------------- retakes

export async function resetDemoAccount(email: string) {
  if (!demoMode || !isDemoEmail(email)) return;
  const user = await (await col("users")).findOne({ email, demo: 1 }, { projection: { id: 1 } });
  if (!user) return;
  const id = user.id;
  const showIds = (await (await col("shows")).find({ seller_id: id }, { projection: { id: 1 } }).toArray()).map((s) => s.id);
  showIds.forEach(stopCrowd);

  // Everything in the seller's shows, and everything the buyer did anywhere.
  const inShows = { show_id: { $in: showIds } };
  const theirs = { $or: [inShows, { viewer_id: id }] };
  const orderIds = (await (await col("orders")).find(theirs, { projection: { id: 1 } }).toArray()).map((o) => o.id);
  const invoiceIds = (await (await col("invoices")).find(theirs, { projection: { id: 1 } }).toArray()).map((v) => v.id);
  await Promise.all([
    col("shows").then((c) => c.deleteMany({ id: { $in: showIds } })),
    col("items").then((c) => c.deleteMany(inShows)),
    col("messages").then((c) => c.deleteMany(theirs)),
    col("claims").then((c) => c.deleteMany(theirs)),
    col("bids").then((c) => c.deleteMany(theirs)),
    col("orders").then((c) => c.deleteMany({ id: { $in: orderIds } })),
    col("order_items").then((c) => c.deleteMany({ order_id: { $in: orderIds } })),
    col("invoices").then((c) => c.deleteMany({ id: { $in: invoiceIds } })),
    col("invoice_items").then((c) => c.deleteMany({ invoice_id: { $in: invoiceIds } })),
    col("agents").then((c) => c.deleteMany({ viewer_id: id })),
    col("shop_info").then((c) => c.deleteMany({ seller_id: id })),
    col("knowledge_chunks").then((c) => c.deleteMany({ $or: [{ seller_id: id }, inShows] })),
    col("sessions").then((c) => c.deleteMany({ user_id: id })),
    col("accounts").then((c) => c.deleteMany({ user_id: id })),
    col("verification_tokens").then((c) => c.deleteMany({ identifier: email })),
    col("password_reset_tokens").then((c) => c.deleteMany({ identifier: email })),
  ]);
  await (await col("users")).deleteOne({ id });
}

// ----------------------------------------------------------------- the crowd

type Crowd = {
  showId: string;
  seller: string; // first name, for greetings
  timers: Set<NodeJS.Timeout>;
  leave: (() => void)[];
  listed: Set<string>; // items seen going live, in order
  done: Set<string>; // one-off reactions already made
};

// Kept on globalThis so dev reloads keep the running crowds (and their viewer slots).
const g = globalThis as unknown as { __liveDropCrowds?: Map<string, Crowd>; __liveDropCrowdReact?: (crowd: Crowd, event: ShowEvent) => void };
g.__liveDropCrowds ??= new Map();
const crowds = g.__liveDropCrowds;

const BOT_NAMES = new Set(DEMO.crowd.join.map((l) => l.who));
const botId = (name: string) => `demo-crowd-${name.toLowerCase()}`;
const isBot = (nameOrId: unknown) => typeof nameOrId === "string" && (BOT_NAMES.has(nameOrId) || nameOrId.startsWith("demo-crowd-"));
const once = (crowd: Crowd, key: string) => !crowd.done.has(key) && Boolean(crowd.done.add(key));
const dollars = (cents: number) => Math.floor(cents / 100);

// Starts the crowd in a live show by the scripted demo seller. Safe to call often: a no-op otherwise.
export async function ensureCrowd(showId: string) {
  if (!demoMode || crowds.has(showId)) return;
  const show = await getShow(showId);
  if (show?.status !== "live") return;
  const seller = await (await col("users")).findOne({ id: show.seller_id, demo: 1 }, { projection: { name: 1 } });
  if (!seller || crowds.has(showId)) return;
  const crowd: Crowd = { showId, seller: seller.name.split(" ")[0], timers: new Set(), leave: [], listed: new Set(), done: new Set() };
  crowds.set(showId, crowd);
  // Each bot joins as a listener on the show, so the viewer count goes up as they arrive. The first one in
  // also follows the show for the whole crowd (through the latest code, even after a dev reload).
  DEMO.crowd.join.forEach((line, i) =>
    later(crowd, line.afterMs ?? 0, () => {
      crowd.leave.push(subscribe(showId, i === 0 ? (event) => g.__liveDropCrowdReact?.(crowd, event) : () => {}));
      publish(showId, { type: "presence", viewers: viewerCount(showId) });
      return say(crowd, line);
    }),
  );
}

function stopCrowd(showId: string) {
  const crowd = crowds.get(showId);
  if (!crowd) return;
  crowds.delete(showId);
  crowd.timers.forEach(clearTimeout);
  crowd.leave.forEach((leave) => leave());
  publish(showId, { type: "presence", viewers: viewerCount(showId) });
}

function later(crowd: Crowd, ms: number, fn: () => unknown) {
  const timer = setTimeout(() => {
    crowd.timers.delete(timer);
    void Promise.resolve()
      .then(fn)
      .catch((err) => console.error("[demo crowd]", err));
  }, ms);
  timer.unref?.();
  crowd.timers.add(timer);
}

// A bot chats through the normal path, so "SOLD" claims and a number bids.
async function say(crowd: Crowd, line: CrowdLine, vars: Record<string, string> = {}) {
  if (!crowds.has(crowd.showId) || (await getShow(crowd.showId))?.status !== "live") return;
  const text = line.text.replace(/\{(\w+)\}/g, (_, key: string) => (key === "seller" ? crowd.seller : (vars[key] ?? "")));
  await postMessage(crowd.showId, { id: botId(line.who), name: line.who }, text);
}

async function topBid(itemId: string) {
  return (await col("bids")).findOne({ item_id: itemId }, { sort: { amount_cents: -1, created_at: 1 }, projection: { amount_cents: 1, viewer_name: 1 } });
}

g.__liveDropCrowdReact = (crowd, event) => {
  const c = DEMO.crowd;
  switch (event.type) {
    case "item": {
      const item = event.item as { id: string; status: string };
      if (event.audience !== "all" || item.status !== "listed" || crowd.listed.has(item.id)) return;
      const lines = c.items[crowd.listed.size] ?? c.itemFallback;
      crowd.listed.add(item.id);
      for (const line of lines) later(crowd, line.afterMs ?? 0, () => say(crowd, line));
      return;
    }

    case "claim": {
      // A real buyer got it first: one bot claims a moment too late and lands in line behind them.
      const itemId = event.item_id as string;
      if (event.status !== "won" || isBot(event.viewer_id) || !once(crowd, `claim:${itemId}`)) return;
      later(crowd, c.lateClaim.afterMs, async () => {
        const claim = await (await col("claims")).findOne({ item_id: itemId, viewer_id: event.viewer_id as string }, { projection: { source: 1 } });
        if (claim?.source !== "human") return; // AI agent purchases get their own reaction
        await say(crowd, c.lateClaim);
        later(crowd, c.lateClaim.thenAfterMs, () => say(crowd, { who: c.lateClaim.who, text: c.lateClaim.then }));
      });
      return;
    }

    case "auction_started": {
      const itemId = event.item_id as string;
      later(crowd, c.bidder.openAfterMs, async () => {
        const item = await getItem(itemId);
        if (!item || !auctionRunning(item) || (await topBid(itemId))) return;
        await say(crowd, { who: c.bidder.who, text: String(dollars(item.auction_start_cents ?? item.price_cents) + c.bidder.raise) });
      });
      return;
    }

    case "bid": {
      // Answers a real bid, up to a ceiling below what the buyer's next bid will be. Then gives up.
      if (isBot(event.name)) return;
      const itemId = event.item_id as string;
      later(crowd, c.bidder.counterAfterMs, async () => {
        const [item, top] = await Promise.all([getItem(itemId), topBid(itemId)]);
        if (!item || !auctionRunning(item) || !top || isBot(top.viewer_name)) return;
        const counter = dollars(top.amount_cents) + c.bidder.raise;
        if (counter <= dollars(item.auction_start_cents ?? item.price_cents) * c.bidder.maxTimesStart) await say(crowd, { who: c.bidder.who, text: String(counter) });
        else if (once(crowd, `gave-up:${itemId}`)) await say(crowd, { who: c.bidder.who, text: c.bidder.giveUp });
      });
      return;
    }

    case "auction_ended":
      if (event.winner && !isBot(event.winner)) later(crowd, c.congrats.afterMs, () => say(crowd, c.congrats, { winner: String(event.winner).split(" ")[0] }));
      return;

    case "agent_bought":
      for (const line of c.agentBought) later(crowd, line.afterMs ?? 0, () => say(crowd, line));
      return;

    case "message": {
      // The seller answered a question the assistant couldn't: someone asks again, and the assistant now knows.
      const m = event.message as { kind: string; reply_to: string | null };
      if (m.kind !== "seller" || !m.reply_to || !once(crowd, `ask-again:${m.reply_to}`)) return;
      later(crowd, c.askAgain.afterMs, async () => {
        const question = await (await col("messages")).findOne({ id: m.reply_to! }, { projection: { text: 1 } });
        if (question) await say(crowd, c.askAgain, { question: question.text });
      });
      return;
    }

    case "show":
      if (event.status === "ended") setTimeout(() => stopCrowd(crowd.showId), 0);
      return;
  }
};
