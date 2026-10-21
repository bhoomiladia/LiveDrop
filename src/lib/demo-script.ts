// Demo video script. With NEXT_PUBLIC_DEMO_MODE=on, clicking an empty field types its line from here,
// "Start talking" in the studio plays the seller's next item line as if the browser heard it, and a few
// simulated viewers fill the seller's show (see demo-video.ts). Everything else is real: AI, PayPal, chat.
// Recorded on two devices, the seller in the studio and the buyer in the show, then edited side by side.
// Edit the lines here; the screens pick them up.

export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "on";

export type DemoRole = "seller" | "buyer";

// Something a simulated viewer says, `afterMs` after whatever set it off.
export type CrowdLine = { who: string; text: string; afterMs?: number };

export const DEMO = {
  seller: {
    name: "Kabir Sethi",
    email: "kabir@kabirscloset.in",
    password: "LiveDrop@2026",
    shopName: "Kabir's Closet",
    bio: "Pre-loved tees, accessories and watches, checked and cleaned before they ship.",
  },
  buyer: {
    name: "Tara Menon",
    email: "tara@taramenon.in",
    password: "LiveDrop@2026",
    bio: "Always hunting for fun graphic tees and a good watch.",
    interests: "Graphic tees, leather wallets and watches",
  },

  // The shop assistant answers from this. Leave gift wrap out: that question goes to the seller.
  shopInfo: {
    shipping:
      "We ship across the US and to Canada. US shipping is a flat 7 dollars per show and takes 3 to 5 business days. Shipping to Canada is 15 dollars and takes 5 to 8 business days.",
    returns: "Returns within 14 days if unused and in the original packaging. Buyer pays return shipping. Flash auction items are final sale.",
    sizing: "T-shirts run true to size. A medium is 20 inches pit to pit and 28 inches long.",
    other: "Everything is checked and cleaned before it ships. Watches come with a fresh battery.",
  },
  showTitle: "Friday Night Drop",

  // What the seller says out loud while holding each item up, in order, written the way Chrome transcribes it.
  // Item 2 is the flash auction; item 3 is what the buyer's AI agent is waiting for.
  items: ["Spider-Man t-shirt size medium $15", "black leather wallet $25", "silver Fastrack watch $45"],

  sellerChat: {
    hello: "Welcome in everyone! Spider-Man tee coming up first.",
    reply: "Yes! Free gift wrap on every order, just ask in chat.", // to the question the assistant flags
  },

  // The buyer's chat box: each click types the next line. During a flash auction it types a bid instead.
  buyerChat: ["hi from New Jersey!", "do you ship to canada?", "SOLD", "do you gift wrap?", "my agent just got the watch!"],
  bidStep: 3, // the buyer's bid: this many dollars over the top bid

  agentWish: "Silver watch",
  trackingNumber: "9400111899223197428490",

  crowd: {
    // They join when the show goes live, one by one, and count as viewers.
    join: [
      { who: "Riya", afterMs: 3_000, text: "hi {seller}!" },
      { who: "Aarav", afterMs: 9_000, text: "hello from Toronto" },
      { who: "Zoya", afterMs: 16_000, text: "just joined!" },
    ],
    // Chatter as each item goes live, in listing order.
    items: [
      [
        { who: "Riya", afterMs: 2_500, text: "omg spidey" },
        { who: "Aarav", afterMs: 6_000, text: "my little brother would love this" },
      ],
      [{ who: "Zoya", afterMs: 2_500, text: "that leather looks so good" }],
      [
        { who: "Aarav", afterMs: 2_000, text: "ooh Fastrack" },
        { who: "Riya", afterMs: 6_500, text: "the silver one is so clean" },
      ],
    ] as CrowdLine[][],
    itemFallback: [{ who: "Riya", afterMs: 3_000, text: "love this one" }] as CrowdLine[],
    // A real buyer claimed first: this viewer claims a moment too late and lands in line behind them.
    lateClaim: { who: "Aarav", afterMs: 1_600, text: "SOLD", then: "argh so close", thenAfterMs: 2_500 },
    // Flash auctions: opens $2 over the start, answers each real bid with +$2 up to 1.5x the start, then gives up.
    bidder: { who: "Zoya", openAfterMs: 4_000, counterAfterMs: 2_500, raise: 2, maxTimesStart: 1.5, giveUp: "too rich for me" },
    congrats: { who: "Riya", afterMs: 1_500, text: "congrats {winner}!" },
    agentBought: [
      { who: "Riya", afterMs: 2_000, text: "wait an AI agent got it already" },
      { who: "Aarav", afterMs: 4_500, text: "that was so fast lol" },
    ] as CrowdLine[],
    // After the seller answers a question the assistant couldn't, someone asks it again and the assistant now knows.
    askAgain: { who: "Riya", afterMs: 12_000, text: "sorry missed that, {question}" },
  },
};

export function isDemoEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e === DEMO.seller.email || e === DEMO.buyer.email;
}

// Seller and buyer record on separate devices: each device remembers which account it signed up,
// so the sign-in page types the right one.
const ROLE_KEY = "livedrop-demo-role";

export function rememberDemoRole(role: DemoRole) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {}
}

export function demoRoleOnThisDevice(): DemoRole | null {
  try {
    const role = localStorage.getItem(ROLE_KEY);
    return role === "seller" || role === "buyer" ? role : null;
  } catch {
    return null;
  }
}
