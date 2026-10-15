import OnwardSummitTemplate from "@/components/ui/onward-summit-template";
import { ensureDemo } from "@/lib/demo";

export const metadata = { title: "Judges: try Live Drop in 2 minutes" };
export const dynamic = "force-dynamic";

// Judge mode landing page, built on the same template and palette as the home page.
export default async function JudgePage() {
  const demo = await ensureDemo();
  const email = process.env.JUDGE_PAYPAL_EMAIL;
  const password = process.env.JUDGE_PAYPAL_PASSWORD;

  return (
    <OnwardSummitTemplate
      topSection={<JudgeSteps demoShowId={demo?.showId ?? null} email={email} password={password} />}
      brand="Live Drop"
      title="Judge mode"
      tagline={"Try Live Drop in 2 minutes.\nNo install, no going live yourself."}
      date="Judge mode"
      city="PayPal Sandbox"
      palette="cobalt"
      glyph="arrow"
      startsAt="2026-11-06T19:00:00-05:00"
      register={{ label: "Open the demo show", href: "/api/judge/buyer" }}
      expect={{
        title: "What's real, and what's simulated",
        intro: "Everything that touches money or AI is real. Only the seller and three viewers are played by a script.",
        features: [
          { icon: "ring", title: "Real PayPal Sandbox", text: "Every checkout, hold, refund, invoice and tracking number is a real PayPal Sandbox API call with test money." },
          { icon: "arrow", title: "Real AI", text: "Listings, chat claims, agent matching and shop-assistant answers use Gemini. Store prices come from Channel3." },
          { icon: "plus", title: "Simulated seller", text: "Rosa lists a new item about every 45 seconds. Ava, Leo and Sam chat and claim, but never pay, so their items pass to you." },
        ],
      }}
      guests={null}
      agenda={null}
      speakers={null}
      venue={null}
      faq={{
        title: "Questions judges ask",
        items: [
          { q: "Do I need to create an account?", a: "No. “Open the demo show” signs you in as a fresh demo buyer with one click. Each judge gets their own bag." },
          { q: "Which PayPal login do I use?", a: "The sandbox buyer login shown above. It only works on the PayPal Sandbox and holds test money." },
          { q: "How do I see the seller's side?", a: "Use “Open Rosa's studio”. It signs you in as the demo seller, with the orders desk and the AG Studio control room." },
          { q: "Can I try going live myself?", a: "Yes. Create a seller account, start a show, turn on your camera and say an item and its price. Open the viewer link in a private window to buy from yourself." },
        ],
      }}
      cta={null}
      footer={{
        links: [
          { label: "Home", href: "/" },
          { label: "Demo show", href: "/api/judge/buyer" },
          { label: "Rosa's studio", href: "/api/judge/seller" },
          { label: "Create an account", href: "/signup" },
        ],
        note: "Live Drop · Built by Team xcoded for the PayPal AI Hackathon 2026 · Sandbox only, no real money.",
      }}
    />
  );
}

function JudgeSteps({ demoShowId, email, password }: { demoShowId: string | null; email?: string; password?: string }) {
  const steps = [
    {
      title: "Watch and buy",
      text: "You're signed in as a demo buyer. Wait for an item, tap Claim (or type “mine” in chat), then pay with PayPal. Ask “do you ship to canada?” and the shop assistant answers from the shop's own policies, with its source. Every fourth item is a flash auction.",
      cta: "Open the demo show",
      href: "/api/judge/buyer",
    },
    {
      title: "Send an AI shopping agent",
      text: "In the same show, open “Send your AI agent”. Try wish “hat”, max $20 and a 1 minute undo window, then save PayPal. When a matching item goes live, your agent buys it with the money on hold. Undo it, or let the payment complete.",
      cta: "Same demo show",
      href: "/api/judge/buyer",
    },
    {
      title: "See the seller's side",
      text: "Signs you in as Rosa. Watch items arrive, reply to questions the assistant flagged, and use the orders desk for refunds, tracking and PayPal invoices. Then open Insights for AG Studio dashboards and ask the Show Producer to check with PayPal.",
      cta: "Open Rosa's studio",
      href: "/api/judge/seller",
    },
    {
      title: "Go live yourself",
      text: "Create a seller account, start a show, turn on your camera and say an item and its price. Open the viewer link in a private window with a buyer account to buy from yourself.",
      cta: "Create an account",
      href: "/signup",
    },
  ];

  return (
    <div>
      <div className="ows-sec-head">
        <div>
          <h2 className="ows-h2">Four steps, two minutes</h2>
          <p className="ows-intro">
            {demoShowId ? "A demo show is running right now. Start with step one." : "Judge mode is turned off on this server, so only step four is available."}
          </p>
        </div>
        <div style={{ padding: "16px 18px", borderRadius: 8, background: "var(--ows-tint)", minWidth: 280 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ows-mid)" }}>PayPal sandbox buyer login</p>
          {email && password ? (
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}>
              {email}
              <br />
              {password}
            </p>
          ) : (
            <p style={{ marginTop: 8, fontSize: 14, color: "var(--ows-muted)" }}>Use any PayPal sandbox personal account (US).</p>
          )}
          <p style={{ marginTop: 8, fontSize: 12, color: "var(--ows-muted)" }}>Test money only. A private window avoids clashing with a real PayPal login.</p>
        </div>
      </div>
      <ol className="ows-agenda">
        {steps.map((s, i) => {
          const off = !demoShowId && i < 3;
          return (
            <li key={s.title} className="ows-row" style={{ "--k": i, padding: "22px 4px", display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 18, alignItems: "start", opacity: off ? 0.45 : 1 } as React.CSSProperties}>
              <span style={{ fontSize: 22, fontWeight: 450, letterSpacing: "-.02em", color: "var(--ows-mid)", fontVariantNumeric: "tabular-nums" }}>0{i + 1}</span>
              <div>
                <p style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-.015em" }}>{s.title}</p>
                <p style={{ marginTop: 6, fontSize: 14.5, lineHeight: 1.5, color: "var(--ows-muted)", maxWidth: 640 }}>{s.text}</p>
              </div>
              {off ? (
                <span style={{ fontSize: 13, color: "var(--ows-muted)" }}>Unavailable</span>
              ) : (
                <a href={s.href} className={`ows-btn ows-btn--sm ${i === 0 ? "ows-btn--accent" : "ows-btn--dark"}`}>
                  {s.cta}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
