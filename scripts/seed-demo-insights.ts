// Seeds three past shows into the demo seller's account (demo-script.ts), so the Insights
// control room has history to chart and the Show Producer has something to advise on.
// The story in the data: graphic tees and watches go in under a minute, AI agents buy watches,
// caps, scarves and sunglasses sit unsold. One claim in the latest seeded show is still unpaid.
//
//   npm run db:seed-demo
//
// Safe to re-run (e.g. after a demo retake recreates the account): seeded rows all have ids
// starting with "seed-" and are replaced each time. Real shows are left alone.

import { closeDb, col, linkId, withId } from "../src/lib/db.ts";
import { DEMO } from "../src/lib/demo-script.ts";

type Outcome = "live" | "auction" | "agent" | "invoice" | "unsold" | "unpaid";
// title, category, size, price $, store price $, outcome, buyer, minutes to claim, others who claimed too late, final auction price $
type ItemSpec = [string, string, string | null, number, number | null, Outcome, string?, number?, string[]?, number?];
type ShowSpec = { key: string; title: string; start: string; items: ItemSpec[]; questions: [string, string][]; flagged: [string, string] };

const SHOWS: ShowSpec[] = [
  {
    key: "s1",
    title: "Graphic Tee Tuesday",
    start: "2026-09-15T19:00:00+05:30",
    items: [
      ["Batman Logo Tee", "Shirts & tops", "M", 18, 22, "live", "Riya Shah", 0.4, ["Aarav Mehta", "Zoya Khan"]],
      ["Nirvana Band Tee", "Shirts & tops", "L", 24, 30, "auction", "Aarav Mehta", 0.8, ["Dev Patel", "Riya Shah"], 31],
      ["Avengers Tee", "Shirts & tops", "S", 15, 19, "live", "Tara Menon", 0.5, ["Neha Kapoor"]],
      ["Plain Beige Cap", "Caps", null, 10, 12, "unsold"],
      ["Pokémon Pikachu Tee", "Shirts & tops", "M", 16, 20, "live", "Zoya Khan", 0.3, ["Riya Shah", "Dev Patel", "Meera Iyer"]],
      ["Striped Knit Scarf", "Scarves", null, 14, 18, "unsold"],
      ["Denim Tote Bag", "Bags", null, 20, 28, "invoice", "Neha Kapoor", 2.5],
      ["Star Wars Tee", "Shirts & tops", "XL", 18, 22, "live", "Dev Patel", 0.6, ["Aarav Mehta"]],
    ],
    questions: [
      ["is the batman tee true to size?", "T-shirts run true to size. A medium is 20 inches pit to pit and 28 inches long."],
      ["do you ship to canada?", "Yes, shipping to Canada is 15 dollars and takes 5 to 8 business days."],
    ],
    flagged: ["can you do a bundle price on 2 tees?", "Sure! $5 off any two tees, just claim both."],
  },
  {
    key: "s2",
    title: "Watch & Wallet Night",
    start: "2026-09-29T19:30:00+05:30",
    items: [
      ["Casio Vintage Digital Watch", "Watches", null, 35, 45, "live", "Tara Menon", 0.7, ["Riya Shah", "Dev Patel"]],
      ["Brown Leather Bifold Wallet", "Wallets", null, 22, 30, "live", "Meera Iyer", 1.2],
      ["Titan Silver Analog Watch", "Watches", null, 48, 70, "agent", "Ishaan Rao", 0.1, ["Aarav Mehta"]],
      ["Black Card Holder", "Wallets", null, 12, 15, "unsold"],
      ["Fossil Chronograph Watch", "Watches", null, 65, 95, "auction", "Aarav Mehta", 0.5, ["Tara Menon", "Zoya Khan", "Dev Patel"], 82],
      ["Aviator Sunglasses", "Sunglasses", null, 18, 25, "unsold"],
      ["Canvas Belt", "Accessories", null, 10, 14, "unsold"],
      ["Sonata Gold Watch", "Watches", null, 40, 55, "invoice", "Riya Shah", 3],
    ],
    questions: [
      ["does the casio come with a battery?", "Yes, every watch comes with a fresh battery."],
      ["what's the return policy?", "Returns within 14 days if unused and in the original packaging. Flash auction items are final sale."],
    ],
    flagged: ["is the fossil strap real leather?", "Yes, genuine leather strap, lightly worn."],
  },
  {
    key: "s3",
    title: "Sunday Thrift Haul",
    start: "2026-10-11T18:00:00+05:30",
    items: [
      ["Spider-Verse Graphic Tee", "Shirts & tops", "M", 17, 21, "live", "Tara Menon", 0.3, ["Riya Shah", "Aarav Mehta"]],
      ["Seiko 5 Automatic Watch", "Watches", null, 85, 140, "auction", "Dev Patel", 0.4, ["Aarav Mehta", "Zoya Khan", "Tara Menon"], 104],
      ["Corduroy Bucket Hat", "Caps", null, 12, 16, "unsold"],
      ["Leather Passport Wallet", "Wallets", null, 26, 34, "live", "Zoya Khan", 1.5],
      ["Garfield Tee", "Shirts & tops", "L", 15, 18, "live", "Neha Kapoor", 0.6, ["Meera Iyer"]],
      ["HMT Janata Watch", "Watches", null, 55, 80, "agent", "Ishaan Rao", 0.1, ["Dev Patel"]],
      ["Round Tinted Sunglasses", "Sunglasses", null, 16, 22, "unpaid", "Meera Iyer", 2],
      ["Rolling Stones Tee", "Shirts & tops", "M", 20, 25, "live", "Riya Shah", 0.5, ["Zoya Khan", "Neha Kapoor"]],
      ["Black Snapback Cap", "Caps", null, 11, 14, "unsold"],
    ],
    questions: [
      ["is the seiko running?", "Yes, it's an automatic and was serviced before the show."],
      ["how long does shipping take?", "US shipping is a flat 7 dollars per show and takes 3 to 5 business days."],
    ],
    flagged: ["do you gift wrap?", "Yes! Free gift wrap on every order, just ask in chat."],
  },
];

const CHATTER = ["hi from Pune!", "love this drop", "that one is so clean", "omg yes", "waiting for watches", "first time here!", "great prices"];
const SHIPPING = 700;
const MIN = 60_000;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cents = (usd: number) => Math.round(usd * 100);

async function main() {
  const users = await col("users");
  const seller = await users.findOne({ email: DEMO.seller.email }, { projection: { id: 1, name: 1 } });
  if (!seller) throw new Error(`No account for ${DEMO.seller.email}. Sign up the demo seller first.`);
  const tara = await users.findOne({ email: DEMO.buyer.email }, { projection: { id: 1 } });
  const viewerId = (name: string) => (name === DEMO.buyer.name && tara ? tara.id : `seed-viewer-${slug(name)}`);

  // Clear the previous seed.
  const seeded = { id: { $regex: "^seed-" } };
  const showIds = (await (await col("shows")).find({ seller_id: seller.id, ...seeded }, { projection: { id: 1 } }).toArray()).map((s) => s.id);
  const orderIds = (await (await col("orders")).find({ show_id: { $in: showIds } }, { projection: { id: 1 } }).toArray()).map((o) => o.id);
  const invoiceIds = (await (await col("invoices")).find({ show_id: { $in: showIds } }, { projection: { id: 1 } }).toArray()).map((v) => v.id);
  const inShows = { show_id: { $in: showIds } };
  await Promise.all([
    col("shows").then((c) => c.deleteMany({ id: { $in: showIds } })),
    col("items").then((c) => c.deleteMany(inShows)),
    col("claims").then((c) => c.deleteMany(inShows)),
    col("bids").then((c) => c.deleteMany(inShows)),
    col("messages").then((c) => c.deleteMany(inShows)),
    col("orders").then((c) => c.deleteMany({ id: { $in: orderIds } })),
    col("order_items").then((c) => c.deleteMany({ order_id: { $in: orderIds } })),
    col("invoices").then((c) => c.deleteMany({ id: { $in: invoiceIds } })),
    col("invoice_items").then((c) => c.deleteMany({ invoice_id: { $in: invoiceIds } })),
  ]);

  const rows = { shows: [] as never[], items: [] as never[], claims: [] as never[], bids: [] as never[], messages: [] as never[], orders: [] as never[], order_items: [] as never[], invoices: [] as never[], invoice_items: [] as never[] };
  const push = <K extends keyof typeof rows>(k: K, row: Record<string, unknown>) => rows[k].push(row as never);
  let msgN = 0;
  const say = (showId: string, at: number, who: string, text: string, kind: string, extra: Record<string, unknown> = {}) => {
    const id = `seed-msg-${showId.slice(5)}-${++msgN}`;
    push("messages", withId({ id, show_id: showId, viewer_id: who === seller.name ? seller.id : viewerId(who), viewer_name: who, text, kind, item_id: null, created_at: at, ...extra }));
    return id;
  };

  for (const s of SHOWS) {
    const showId = `seed-show-${s.key}`;
    const start = Date.parse(s.start);
    const end = start + (s.items.length * 5 + 6) * MIN;
    push("shows", withId({ id: showId, seller_id: seller.id, title: s.title, status: "ended", shipping_cents: SHIPPING, agent_delay_seconds: 30, claim_minutes: 2, created_at: start - 30 * MIN, started_at: start, ended_at: end }));

    say(showId, start + 20_000, seller.name, `Welcome to ${s.title}! Lots of good stuff tonight.`, "seller");
    CHATTER.slice(0, 4).forEach((text, i) => say(showId, start + (40 + i * 25) * 1000, ["Riya Shah", "Aarav Mehta", "Zoya Khan", "Neha Kapoor"][i], text, "other"));

    s.items.forEach(([title, category, size, price, store, outcome, buyer, minutes = 1, late = [], final], i) => {
      const itemId = `seed-item-${s.key}-${i + 1}`;
      const listedAt = start + (2 + i * 5) * MIN;
      const sold = outcome !== "unsold" && outcome !== "unpaid";
      const shipped = s.key !== "s3" || i % 2 === 0;
      const winAt = listedAt + Math.round(minutes * MIN);
      const auction = outcome === "auction";
      const pricePaid = cents(auction ? final! : price);
      const winnerClaim = buyer ? `seed-claim-${s.key}-${i + 1}-0` : null;

      push("items", withId({
        id: itemId, show_id: showId, seq: i + 1, title, size, condition: i % 3 === 0 ? "like new" : "good",
        description: `${title}${size ? `, size ${size}` : ""}. Checked and cleaned before it ships.`,
        price_cents: pricePaid, status: sold ? (shipped ? "shipped" : "paid") : outcome === "unpaid" ? "claimed" : "listed",
        transcript: null, image_data: null, retail_hint: store ? `Similar new items: $${store}+ in stores` : null, retail_cents: store ? cents(store) : null, retail_sources: null,
        memory_hint: null, category,
        auction_ends_at: auction ? listedAt + 2 * MIN : null, auction_start_cents: auction ? cents(price) : null, auction_closed: auction ? 1 : 0,
        ai_status: "done", winner_claim_id: winnerClaim, created_at: listedAt - MIN, listed_at: listedAt,
      }));

      if (!buyer) {
        if (i % 2) say(showId, listedAt + 40_000, "Zoya Khan", "hmm not for me", "other");
        return;
      }

      // Claims: the winner, then the people who were a moment too late (or outbid).
      const claimers = [buyer, ...late];
      claimers.forEach((who, n) => {
        const at = winAt + n * 1500;
        const agent = n === 0 && outcome === "agent";
        const bidCents = auction ? pricePaid - n * 300 : null;
        const messageId = agent ? null : auction ? say(showId, at, who, String(bidCents! / 100), "bid", { item_id: itemId }) : say(showId, at, who, n ? "SOLD" : ["SOLD", "mine!", "sold!!"][i % 3], "claim", { item_id: itemId });
        push("claims", withId({
          id: `seed-claim-${s.key}-${i + 1}-${n}`, show_id: showId, item_id: itemId, viewer_id: viewerId(who), viewer_name: who, message_id: messageId,
          source: agent ? "agent" : "human", status: n ? "lost" : outcome === "unpaid" ? "won" : "paid", created_at: at, won_at: n ? null : winAt, bid_cents: bidCents,
        }));
        if (auction) push("bids", withId({ id: `seed-bid-${s.key}-${i + 1}-${n}`, show_id: showId, item_id: itemId, viewer_id: viewerId(who), viewer_name: who, amount_cents: bidCents!, message_id: messageId, created_at: at }));
      });
      if (outcome === "agent") say(showId, winAt + 4000, "Riya Shah", "wait an AI agent got it already", "other");
      if (outcome === "unpaid") return;

      // The PayPal payment.
      const orderId = `seed-order-${s.key}-${i + 1}`;
      const kind = outcome === "agent" ? "agent" : outcome === "invoice" ? "invoice" : "bag";
      const paidAt = outcome === "invoice" ? end + 18 * 60 * MIN : winAt + 90_000;
      const refunded = s.key === "s2" && i === 1 ? 500 : 0; // a small partial refund (scuffed corner)
      let invoiceId: string | null = null;
      if (outcome === "invoice") {
        invoiceId = `seed-invoice-${s.key}-${i + 1}`;
        push("invoices", withId({ id: invoiceId, show_id: showId, viewer_id: viewerId(buyer), viewer_name: buyer, paypal_invoice_id: `SEED-INV-${s.key}-${i + 1}`, status: "paid", item_cents: pricePaid, shipping_cents: SHIPPING, payer_url: null, qr_png: null, expires_at: end + 7 * 24 * 60 * MIN, created_at: end + 5 * MIN, updated_at: paidAt }));
        push("invoice_items", { _id: linkId(invoiceId, itemId), invoice_id: invoiceId, item_id: itemId });
      }
      push("orders", withId({
        id: orderId, show_id: showId, viewer_id: viewerId(buyer), viewer_name: buyer, kind, paypal_order_id: `SEED-${s.key.toUpperCase()}-${i + 1}`,
        status: refunded ? "partially_refunded" : "paid", item_cents: pricePaid, shipping_cents: SHIPPING, capture_id: `SEED-CAP-${s.key}-${i + 1}`, authorization_id: null,
        tracking_number: shipped ? `94001118992231974${String(i).padStart(2, "0")}${s.key.slice(1)}0` : null, carrier: shipped ? "USPS" : null,
        refunded_cents: refunded, invoice_id: invoiceId, agent_id: null, undo_until: null, created_at: paidAt, updated_at: paidAt,
      }));
      push("order_items", { _id: linkId(orderId, itemId), order_id: orderId, item_id: itemId });
    });

    // The shop assistant answering questions, and one it had to pass to the seller.
    s.questions.forEach(([q, a], n) => {
      const at = start + (5 + n * 11) * MIN;
      const qid = say(showId, at, ["Aarav Mehta", "Meera Iyer"][n], q, "question");
      say(showId, at + 3000, "Shop assistant", a, "answer", { reply_to: qid, sources: JSON.stringify(["Shop info"]) });
    });
    const fAt = start + 18 * MIN;
    const fid = say(showId, fAt, "Neha Kapoor", s.flagged[0], "question", { needs_seller: 1 });
    say(showId, fAt + 3000, "Shop assistant", "Good question! I've asked the seller.", "answer", { reply_to: fid, needs_seller: 1 });
    say(showId, fAt + 50_000, seller.name, s.flagged[1], "seller", { reply_to: fid });
    say(showId, end - MIN, seller.name, "That's a wrap, thank you all! See you next drop.", "seller");
  }

  for (const [name, list] of Object.entries(rows)) if (list.length) await (await col(name as keyof typeof rows)).insertMany(list);
  const counts = Object.entries(rows).map(([k, v]) => `${v.length} ${k}`).join(", ");
  console.log(`Seeded ${seller.name}'s account: ${counts}.`);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
