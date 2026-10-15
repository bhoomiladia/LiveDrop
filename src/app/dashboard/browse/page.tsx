import AutoRefresh from "@/components/dashboard/auto-refresh";
import ShowCard from "@/components/dashboard/show-card";
import { IconBroadcast } from "@/components/ui/icons";
import { Card, EmptyState, PageHeader } from "@/components/ui/kit";
import { requireAccount } from "@/lib/guards";
import { listPublicShows, type PublicShow } from "@/lib/live";

export const metadata = { title: "Live shows · Live Drop" };
export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  await requireAccount("/dashboard/browse", "buyer");
  const shows = await listPublicShows();

  return (
    <>
      <AutoRefresh />
      <PageHeader kicker="Live shows" title="What's on" description="Join a show, wait for something you love, and claim it. First claim wins." />
      <div className="space-y-10">
        <Group title="Live now" shows={shows.live} empty="Nobody is live right now. This page updates by itself." />
        {shows.upcoming.length > 0 && <Group title="Starting soon" shows={shows.upcoming} />}
        {shows.recent.length > 0 && <Group title="Recently ended" shows={shows.recent} />}
      </div>
    </>
  );
}

function Group({ title, shows, empty }: { title: string; shows: PublicShow[]; empty?: string }) {
  return (
    <section>
      <h2 className="text-xl font-[450] tracking-[-0.02em] mb-4">{title}</h2>
      {shows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shows.map((s) => (
            <ShowCard key={s.id} show={s} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<IconBroadcast size={20} />} title="Nothing here yet">
            {empty}
          </EmptyState>
        </Card>
      )}
    </section>
  );
}
