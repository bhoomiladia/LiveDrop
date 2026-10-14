import Link from "next/link";
import { ensureDemo } from "@/lib/demo";

export const metadata = { title: "Judges: try Live Drop in 2 minutes" };
export const dynamic = "force-dynamic";

// Judge mode landing page: everything needed to try Live Drop without setup.
export default function JudgePage() {
  const demo = ensureDemo();
  const email = process.env.JUDGE_PAYPAL_EMAIL;
  const password = process.env.JUDGE_PAYPAL_PASSWORD;

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="font-extrabold">🔴 Live Drop</Link>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Judges: try it in 2 minutes</h1>
          <p className="text-white/70">
            A demo show is running right now. Rosa, the seller, is simulated: a new item goes live every ~45 seconds. Everything else is real:
            PayPal sandbox payments, Gemini AI, Channel3 store prices and AG Studio dashboards.
          </p>
        </header>

        <section className="rounded-2xl bg-[#ffc439] text-black p-5 space-y-1">
          <h2 className="font-bold">Your PayPal sandbox buyer login (test money)</h2>
          {email && password ? (
            <p className="font-mono text-sm">
              Email: <b>{email}</b>
              <br />
              Password: <b>{password}</b>
            </p>
          ) : (
            <p className="text-sm">Use any PayPal sandbox personal account (US). The team can share one on request.</p>
          )}
          <p className="text-xs text-black/60">Use it whenever a PayPal window asks you to log in. Tip: a private window avoids clashing with a real PayPal login.</p>
        </section>

        {!demo ? (
          <p className="text-white/60">Judge mode is turned off on this server.</p>
        ) : (
          <ol className="space-y-4">
            <Step n={1} title="Watch and buy" cta="Open the live demo show →" href={`/live/${demo.showId}`}>
              Pick a name, wait for an item, then tap <b>SOLD! Claim it</b> (or type “mine” in chat) and pay with PayPal. Ask a question like
              “do you ship to canada?”: the shop assistant answers from the shop&apos;s own info and shows its source (RAG). Every 4th item is a ⚡ flash auction.
            </Step>
            <Step n={2} title="Send an AI shopping agent" cta="Same demo show →" href={`/live/${demo.showId}`}>
              On the right, tap <b>🤖 Send your AI agent</b>. Try wish “hat”, max $20, undo window 1 min, then <b>Save PayPal &amp; activate</b>. When a matching item goes live,
              your agent buys it with money on hold. Undo it, or let the payment complete.
            </Step>
            <Step n={3} title="See the seller's side" cta="Open Rosa's studio →" href="/api/judge/seller">
              Signs you in as Rosa. See items arrive, reply to flagged questions, and use the <b>Orders</b> panel (refunds, tracking, PayPal invoices). Open
              <b> 📊 Control room</b> for AG Studio dashboards and ask the Show Producer “Check with PayPal”.
            </Step>
            <Step n={4} title="Go live yourself" cta="Create a seller account →" href="/signup">
              Sign up, create a show, turn on your camera and say an item and its price. Open the viewer link in a private window to buy from yourself.
            </Step>
          </ol>
        )}

        <section className="rounded-2xl border border-white/10 p-5 text-sm text-white/70 space-y-1">
          <h2 className="font-bold text-white">What&apos;s real here</h2>
          <p>Every payment, hold, refund and invoice is a real PayPal Sandbox API call. Listings, chat claims, agent matching and answers use Gemini.</p>
          <p>Simulated: Rosa (the seller) and the viewers Ava, Leo and Sam. They never pay, so items they claim pass to you after 2 minutes if you&apos;re in line.</p>
        </section>
      </main>
    </div>
  );
}

function Step({ n, title, cta, href, children }: { n: number; title: string; cta: string; href: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
      <h2 className="font-bold text-lg">
        <span className="text-red-400 mr-2">{n}.</span>
        {title}
      </h2>
      <p className="text-sm text-white/70">{children}</p>
      <a href={href} className="inline-flex h-10 px-5 rounded-full bg-white text-black font-semibold text-sm items-center">
        {cta}
      </a>
    </li>
  );
}
