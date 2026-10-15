import ShowsSection from "@/components/home/shows-section";
import OnwardSummitTemplate from "@/components/ui/onward-summit-template";
import { listPublicShows } from "@/lib/live";

// Rendered per request so "Live now" is always current (it also refreshes itself in the browser).
export const dynamic = "force-dynamic";

export default async function Home() {
  const shows = await listPublicShows();
  return (
    <OnwardSummitTemplate
      topSection={<ShowsSection initial={shows} />}
      brand="Live Drop"
      title="Live Drop"
      tagline={"Go live. Say the price.\nGet paid with PayPal."}
      date="AI co-host for live sellers"
      city="PayPal checkout · AI agents"
      palette="cobalt"
      glyph="arrow"
      startsAt="2026-11-06T19:00:00-05:00"
      register={{ label: "Start selling", href: "/signup" }}
      expect={{
        title: "Selling live is fast. Everything after it shouldn't be slow.",
        intro:
          "Live Drop listens and watches while you sell. It lists each item, picks the winner from the chat, and checks buyers out with PayPal in one tap, so you never scroll back through comments again.",
        features: [
          {
            icon: "arrow",
            title: "Speak to list",
            text: "Hold an item up and say “denim jacket, medium, forty-five.” A listing appears instantly, and AI adds the details.",
          },
          {
            icon: "plus",
            title: "First claim wins",
            text: "Viewers type SOLD, mine, or lo quiero. The first valid claim wins; everyone else joins a fair waiting line.",
          },
          {
            icon: "ring",
            title: "One-tap PayPal checkout",
            text: "Buyers pay for their whole bag with one shipping fee, protected by PayPal Purchase Protection.",
          },
          {
            icon: "arrow",
            title: "AI agents in the audience",
            text: "Shoppers can send an AI agent with limits they set. It buys matching items while they sleep, with an undo button.",
          },
          {
            icon: "plus",
            title: "Can’t be tricked",
            text: "Chat is data, never instructions. Prices come from the seller and money only moves through checks written in code.",
          },
          {
            icon: "ring",
            title: "After-show autopilot",
            text: "PayPal invoices for unpaid bags, tracking numbers, and refunds, handled while you pack.",
          },
        ],
      }}
      guests={{
        title: "Built for people who sell on live video.",
        audiences: [
          { role: "Thrift & vintage", pitch: "One-of-a-kind pieces sell in seconds. Live Drop keeps up so you don't double-sell." },
          { role: "Small boutiques", pitch: "Run a weekly drop without a spreadsheet, a DM inbox, or chasing payments." },
          { role: "Collectors", pitch: "Flash auctions from chat bids, with the winner charged through PayPal." },
          { role: "Makers & artists", pitch: "Show your work, answer questions, and get paid before the stream ends." },
        ],
      }}
      agenda={{
        title: "How a Live Drop show runs",
        intro: "From “go live” to every package tracked, in one evening.",
        sessions: [
          { start: "19:00", duration: 5, title: "Go live", track: "Seller", description: "Open the studio, turn on the camera, and share your viewer link." },
          { start: "19:05", duration: 40, title: "Hold it up, say the price", track: "Seller", description: "Each item is listed in a moment. AI looks at the photo and polishes the title and condition." },
          { start: "19:05", duration: 40, title: "Type SOLD, pay with PayPal", track: "Buyers", description: "First claim wins. Buyers pay for their bag in one tap and everyone sees “✅ paid”." },
          { start: "19:05", duration: 40, title: "Agents shop while you sleep", track: "Agents", description: "AI agents buy matching items within signed limits. The money is held until the undo window ends." },
          { start: "19:45", duration: 15, title: "After-show autopilot", track: "Seller", description: "One PayPal invoice per unpaid bag, tracking numbers added, refunds in a tap." },
        ],
      }}
      speakers={null}
      venue={null}
      faq={{
        title: "Questions",
        items: [
          { q: "Is this real money?", a: "Not in this demo. Live Drop runs on the PayPal Sandbox, PayPal's test environment with pretend accounts and money." },
          { q: "Do viewers need an account?", a: "Anyone can watch. To claim, bid and pay, viewers sign in with a free buyer account, so their bag, orders and AI agent follow them across shows." },
          { q: "What if two people type SOLD at once?", a: "Our server's clock decides. The first message it receives wins, and the next person is first in the waiting line." },
          { q: "Can an AI agent overspend?", a: "No. Its limits are a signed permission slip checked by plain code before every purchase, and you get an undo window." },
          { q: "Why pay through PayPal checkout instead of Friends and Family?", a: "Checkout payments come with PayPal Purchase Protection. Friends and Family payments don't." },
          { q: "Which AI does Live Drop use?", a: "Google Gemini (free tier) for listings, chat and matching. Instant plain-code parsing means the show never waits for the AI." },
        ],
      }}
      cta={null}
      footer={{
        links: [
          { label: "Start selling", href: "/signup" },
          { label: "Sign in", href: "/login" },
          { label: "Your shows", href: "/studio" },
          { label: "Features", href: "#expect" },
          { label: "How it works", href: "#agenda" },
          { label: "FAQ", href: "#faq" },
        ],
        note: "Live Drop · Built by Team xcoded for the PayPal AI Hackathon 2026 · Sandbox only, no real money.",
      }}
    />
  );
}
