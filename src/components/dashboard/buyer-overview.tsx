import Link from "next/link";
import { getAgentForViewer, weeklySpentCents } from "@/lib/agents";
import type { Account } from "@/lib/guards";
import { listPublicShows } from "@/lib/live";
import { getBuyerBags, getBuyerOrders } from "@/lib/profile";
import { IconAgent, IconArrowRight, IconBag, IconBroadcast, IconSearch } from "@/components/ui/icons";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, Stat, firstName, money, timeAgo } from "@/components/ui/kit";
import { OrderStatus } from "./order-status";
import ShowCard from "./show-card";

export default function BuyerOverview({ user }: { user: Account }) {
  const shows = listPublicShows();
  const bags = getBuyerBags(user.id);
  const orders = getBuyerOrders(user.id);
  const agent = getAgentForViewer(user.id);
  const activeAgent = agent && agent.status !== "pending" ? agent : null;

  const unpaid = bags.flatMap((b) => b.bag.lines.filter((l) => l.status === "won" || l.status === "invoiced").map((l) => ({ ...l, show: b.show })));
  const unpaidCents = unpaid.reduce((s, l) => s + l.price_cents, 0);
  const paidOrders = orders.filter((o) => ["paid", "partially_refunded", "refunded"].includes(o.status));
  const spent = paidOrders.reduce((s, o) => s + o.item_cents + o.shipping_cents - o.refunded_cents, 0);
  const holds = bags.flatMap((b) => b.bag.lines.filter((l) => l.status === "on_hold"));

  return (
    <>
      <PageHeader
        kicker="Overview"
        title={`Welcome back, ${firstName(user.name)}`}
        description="Shows that are live, what's in your bag, and where your orders are."
        actions={
          <ButtonLink href="/dashboard/browse">
            <IconSearch size={16} /> Browse shows
          </ButtonLink>
        }
      />

      {unpaid.length > 0 && (
        <Card className="mb-6 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-ember-light bg-tint">
          <div className="min-w-0">
            <p className="font-medium">
              {unpaid.length} item{unpaid.length === 1 ? "" : "s"} waiting for payment · {money(unpaidCents)}
            </p>
            <p className="text-[13px] text-ink-soft mt-0.5 truncate">
              {unpaid
                .slice(0, 3)
                .map((l) => l.title)
                .join(", ")}
              {unpaid.length > 3 ? ` and ${unpaid.length - 3} more` : ""}. Unpaid claims pass to the next buyer in line.
            </p>
          </div>
          <ButtonLink href="/dashboard/orders" variant="primary" size="sm">
            Pay now <IconArrowRight size={14} />
          </ButtonLink>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Stat label="Live now" value={shows.live.length} hint={shows.live.length ? "Shows you can join" : "Check back soon"} />
        <Stat label="In your bag" value={unpaid.length} hint={unpaid.length ? `${money(unpaidCents)} to pay` : "Nothing to pay"} />
        <Stat label="Purchases" value={paidOrders.length} hint={holds.length ? `${holds.length} agent hold${holds.length === 1 ? "" : "s"} you can undo` : "Paid with PayPal"} />
        <Stat label="Spent" value={money(spent)} hint="After refunds" />
      </div>

      <section className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl font-[450] tracking-[-0.02em]">Live now</h2>
          <Link href="/dashboard/browse" className="text-[13px] font-medium text-ember hover:text-ink">
            All shows
          </Link>
        </div>
        {shows.live.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shows.live.slice(0, 3).map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState icon={<IconBroadcast size={20} />} title="Nobody is live right now">
              Shows appear here the moment a seller goes live. Your AI agent can watch for you in the meantime.
            </EmptyState>
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link href="/dashboard/orders" className="text-[13px] font-medium text-ember hover:text-ink">
                All orders
              </Link>
            }
          />
          {orders.length ? (
            <ul className="border-t border-line divide-y divide-line">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.items ?? "Order"}</p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {o.seller_name} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                  <OrderStatus status={o.status} shipped={Boolean(o.tracking_number)} />
                  <span className="text-sm font-medium tabular-nums w-16 text-right">{money(o.item_cents + o.shipping_cents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconBag size={20} />} title="No orders yet">
              Join a live show and type SOLD when you see something you love.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Your AI agent"
            action={activeAgent ? <Badge tone={activeAgent.status === "active" ? "success" : "neutral"}>{activeAgent.status === "active" ? "Shopping" : "Paused"}</Badge> : undefined}
          />
          {activeAgent ? (
            <div className="px-5 pb-5">
              <p className="text-sm">&ldquo;{activeAgent.wish}&rdquo;</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Max per item</dt>
                  <dd className="font-medium tabular-nums">{money(activeAgent.max_item_cents)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Left this week</dt>
                  <dd className="font-medium tabular-nums">{money(Math.max(0, activeAgent.weekly_budget_cents - weeklySpentCents(activeAgent.id)))}</dd>
                </div>
              </dl>
              <ButtonLink href="/dashboard/agent" variant="secondary" size="sm" className="mt-5">
                Manage agent
              </ButtonLink>
            </div>
          ) : (
            <EmptyState
              icon={<IconAgent size={20} />}
              title="Let an agent shop for you"
              action={
                <ButtonLink href="/dashboard/agent" size="sm">
                  Set up agent
                </ButtonLink>
              }
            >
              Tell it what you want and your limits. It buys matching items in live shows, and you get time to undo.
            </EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
