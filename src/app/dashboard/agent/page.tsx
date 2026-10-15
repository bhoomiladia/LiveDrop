import AgentPagePanel from "@/components/dashboard/agent-page-panel";
import { OrderStatus } from "@/components/dashboard/order-status";
import { Card, CardHeader, EmptyState, PageHeader, money, timeAgo } from "@/components/ui/kit";
import { requireAccount } from "@/lib/guards";
import { getBuyerOrders } from "@/lib/profile";

export const metadata = { title: "AI agent · Live Drop" };
export const dynamic = "force-dynamic";

const HOW = [
  ["Tell it what you want", "Describe the item, your sizes, the most it may pay each, and a weekly budget."],
  ["Approve PayPal once", "PayPal saves your account for Live Drop. Your limits become a signed permission slip."],
  ["It watches live shows", "When a matching item goes live, plain code checks your limits before anything is bought."],
  ["You can undo", "The money is only held. Undo within your window and nothing is charged."],
];

export default async function AgentPage() {
  const user = await requireAccount("/dashboard/agent", "buyer");
  const purchases = getBuyerOrders(user.id).filter((o) => o.kind === "agent");

  return (
    <>
      <PageHeader kicker="AI agent" title="Your shopping agent" description="It shops live shows for you while you're away, inside limits you set and only you can change." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        <div className="space-y-6 min-w-0">
          <AgentPagePanel defaults={{ wish: user.interests ?? "", sizes: user.sizes ?? "", email: user.email.endsWith("@livedrop.demo") ? "" : user.email }} />
          <Card>
            <CardHeader title="What your agent bought" />
            {purchases.length ? (
              <ul className="border-t border-line divide-y divide-line">
                {purchases.map((o) => (
                  <li key={o.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{o.items ?? "Item"}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {o.show_title} · {timeAgo(o.created_at)}
                      </p>
                    </div>
                    <OrderStatus status={o.status} shipped={Boolean(o.tracking_number)} />
                    <span className="text-sm font-medium tabular-nums w-14 text-right">{money(o.item_cents + o.shipping_cents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-t border-line">
                <EmptyState title="Nothing yet">Purchases your agent makes appear here, with an undo button while the window is open.</EmptyState>
              </div>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title="How it works" />
          <ol className="px-5 pb-5 space-y-4">
            {HOW.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-tint text-brand text-xs font-medium grid place-items-center shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-[13px] text-muted mt-0.5 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
