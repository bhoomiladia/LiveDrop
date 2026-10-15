import Link from "next/link";
import { getShopInfo } from "@/lib/rag";
import { getSellerOverview } from "@/lib/profile";
import type { Account } from "@/lib/guards";
import { IconArrowRight, IconBroadcast, IconChat, IconCheck, IconPlus, IconReceipt } from "@/components/ui/icons";
import { ButtonLink, Card, CardHeader, EmptyState, LiveBadge, PageHeader, Stat, cx, firstName, money, timeAgo } from "@/components/ui/kit";
import { ORDER_KIND, OrderStatus } from "./order-status";

export default function SellerOverview({ user }: { user: Account }) {
  const o = getSellerOverview(user.id);
  const info = getShopInfo(user.id);
  const policies = Object.values(info).filter(Boolean).length;
  const steps = [
    { done: policies > 0, label: "Teach your shop assistant your policies", href: "/dashboard/profile#shop-info" },
    { done: o.shows.length > 0, label: "Create your first show", href: "/dashboard/shows" },
    { done: o.shows.some((s) => s.started_at), label: "Go live and list an item by voice", href: o.shows[0] ? `/studio/${o.shows[0].id}` : "/dashboard/shows" },
  ];
  const setupLeft = steps.filter((s) => !s.done).length;

  return (
    <>
      <PageHeader
        kicker={user.shop_name ?? "Overview"}
        title={`Welcome back, ${firstName(user.name)}`}
        description="Your sales, what needs a reply, and what to ship next."
        actions={
          o.liveShow ? (
            <ButtonLink href={`/studio/${o.liveShow.id}`} variant="brand">
              <IconBroadcast size={16} /> Return to studio
            </ButtonLink>
          ) : (
            <ButtonLink href="/dashboard/shows#new">
              <IconPlus size={16} /> New show
            </ButtonLink>
          )
        }
      />

      {o.liveShow && (
        <Card className="mb-6 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-brand-light bg-tint">
          <div className="flex items-center gap-3 min-w-0">
            <LiveBadge />
            <p className="font-medium truncate">{o.liveShow.title} is live right now</p>
          </div>
          <ButtonLink href={`/studio/${o.liveShow.id}`} variant="primary" size="sm">
            Open studio <IconArrowRight size={14} />
          </ButtonLink>
        </Card>
      )}

      {setupLeft > 0 && (
        <Card className="mb-6">
          <CardHeader title="Get your shop ready" description={`${steps.length - setupLeft} of ${steps.length} done. Each step takes about a minute.`} />
          <ol className="border-t border-line divide-y divide-line">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas transition-colors">
                  <span
                    className={cx(
                      "w-6 h-6 rounded-full grid place-items-center text-xs font-medium shrink-0",
                      s.done ? "bg-success-tint text-success" : "shadow-[inset_0_0_0_1px_var(--line-strong)] text-muted",
                    )}
                  >
                    {s.done ? <IconCheck size={14} /> : i + 1}
                  </span>
                  <span className={cx("text-sm flex-1", s.done && "text-muted line-through")}>{s.label}</span>
                  {!s.done && <IconArrowRight size={15} className="text-muted" />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Collected" value={money(o.collected_cents)} hint={`${o.orders} PayPal order${o.orders === 1 ? "" : "s"}`} />
        <Stat label="Items sold" value={o.sold} hint={`across ${o.shows.length} show${o.shows.length === 1 ? "" : "s"}`} />
        <Stat label="Awaiting payment" value={o.unpaid_items} hint={o.unpaid_items ? `${money(o.unpaid_cents)} claimed, unpaid` : "Nothing waiting"} />
        <Stat label="To ship" value={o.to_ship} hint={o.open_invoices ? `${o.open_invoices} invoice${o.open_invoices === 1 ? "" : "s"} open` : "Paid orders without tracking"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link href="/dashboard/orders" className="text-[13px] font-medium text-brand hover:text-ink">
                All orders
              </Link>
            }
          />
          {o.recentOrders.length ? (
            <ul className="border-t border-line divide-y divide-line">
              {o.recentOrders.map((r) => (
                <li key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.viewer_name} <span className="font-normal text-muted">· {ORDER_KIND[r.kind] ?? r.kind}</span>
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {r.items ?? "Items"} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <OrderStatus status={r.status} shipped={Boolean(r.tracking_number)} />
                  <span className="text-sm font-medium tabular-nums w-16 text-right">{money(r.total_cents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconReceipt size={20} />} title="No orders yet">
              Orders show up here the moment a buyer pays with PayPal.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Questions for you" description="Your shop assistant couldn't answer these from your shop info." />
          {o.questions.length ? (
            <ul className="border-t border-line divide-y divide-line">
              {o.questions.map((q) => (
                <li key={q.id}>
                  <Link href={`/studio/${q.show_id}`} className="block px-5 py-3.5 hover:bg-canvas transition-colors">
                    <p className="text-sm">&ldquo;{q.text}&rdquo;</p>
                    <p className="text-xs text-muted mt-1 truncate">
                      {q.viewer_name} · {q.show_title} · {timeAgo(q.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconChat size={20} />} title="All caught up">
              When a viewer asks something your shop info doesn&apos;t cover, it lands here.
            </EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
