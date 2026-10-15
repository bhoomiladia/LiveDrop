import Link from "next/link";
import NewShowForm from "@/components/dashboard/new-show-form";
import { IconBroadcast, IconChart, IconEye } from "@/components/ui/icons";
import { Badge, ButtonLink, Card, EmptyState, LiveBadge, PageHeader, money, timeAgo } from "@/components/ui/kit";
import { requireAccount } from "@/lib/guards";
import { listShowsForSeller } from "@/lib/live";
import { getShowStats } from "@/lib/profile";

export const metadata = { title: "Shows · Live Drop" };
export const dynamic = "force-dynamic";

export default async function ShowsPage() {
  const user = await requireAccount("/dashboard/shows", "seller");
  const shows = await listShowsForSeller(user.id);
  const stats = await getShowStats(shows.map((s) => s.id));

  return (
    <>
      <PageHeader kicker="Shows" title="Your shows" description="Create a show, go live, and hold items up to the camera. Live Drop lists them and checks buyers out with PayPal." />
      <div className="space-y-6">
        <NewShowForm defaultShippingCents={user.default_shipping_cents ?? 700} defaultClaimMinutes={user.default_claim_minutes ?? 5} />

        <Card>
          {shows.length ? (
            <ul className="divide-y divide-line">
              {shows.map((s) => {
                const st = stats.get(s.id);
                return (
                  <li key={s.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        {s.status === "live" ? <LiveBadge /> : <Badge tone={s.status === "ended" ? "outline" : "neutral"}>{s.status === "ended" ? "Ended" : "Not started"}</Badge>}
                        <Link href={`/studio/${s.id}`} className="font-medium truncate hover:text-brand">
                          {s.title}
                        </Link>
                      </div>
                      <p className="text-[13px] text-muted mt-1.5">
                        {st?.listed ?? 0} listed · {st?.sold ?? 0} sold · {money(st?.collected_cents ?? 0)} collected · shipping {money(s.shipping_cents)} ·{" "}
                        {s.status === "ended" && s.ended_at ? `ended ${timeAgo(s.ended_at)}` : `created ${timeAgo(s.created_at)}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <ButtonLink href={`/live/${s.id}`} variant="ghost" size="sm" title="What viewers see">
                        <IconEye size={15} /> Viewer page
                      </ButtonLink>
                      <ButtonLink href={`/dashboard/insights?show=${s.id}`} variant="secondary" size="sm">
                        <IconChart size={15} /> Insights
                      </ButtonLink>
                      <ButtonLink href={`/studio/${s.id}`} variant={s.status === "live" ? "brand" : "primary"} size="sm">
                        <IconBroadcast size={15} /> {s.status === "ended" ? "Open" : "Studio"}
                      </ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<IconBroadcast size={20} />} title="No shows yet">
              Create your first show above. You can rehearse in the studio before you go live.
            </EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
