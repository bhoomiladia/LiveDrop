import ControlRoom from "@/components/control/control-room";
import InsightsShowPicker from "@/components/dashboard/insights-show-picker";
import { IconChart } from "@/components/ui/icons";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui/kit";
import { getControlData } from "@/lib/control-data";
import { requireAccount } from "@/lib/guards";
import { listShowsForSeller } from "@/lib/live";

export const metadata = { title: "Insights · Live Drop" };
export const dynamic = "force-dynamic";

// AG Studio dashboards over all the seller's shows, plus the Show Producer agent.
// The selected show is the one the Show Producer's PayPal tools (invoices, refunds, release) act on.
export default async function InsightsPage(props: PageProps<"/dashboard/insights">) {
  const user = await requireAccount("/dashboard/insights", "seller");
  const shows = listShowsForSeller(user.id);
  const { show } = await props.searchParams;
  const selected = shows.find((s) => s.id === show) ?? shows.find((s) => s.status === "live") ?? shows[0];

  return (
    <>
      <PageHeader
        kicker="Insights"
        title="Control room"
        description="Dashboards across all your shows. Ask the Show Producer what to bring next time, or to chase unpaid buyers. It asks before it touches money."
        actions={selected && <InsightsShowPicker shows={shows.map((s) => ({ id: s.id, title: s.title }))} selectedId={selected.id} />}
      />
      {selected ? (
        <ControlRoom showId={selected.id} data={getControlData(user.id)} licenseKey={process.env.AG_STUDIO_LICENSE_KEY || undefined} aiEnabled={Boolean(process.env.GEMINI_API_KEY)} />
      ) : (
        <Card>
          <EmptyState icon={<IconChart size={20} />} title="Nothing to chart yet" action={<ButtonLink href="/dashboard/shows" size="sm">Create a show</ButtonLink>}>
            Run your first show and your sales, claims and buyers show up here.
          </EmptyState>
        </Card>
      )}
    </>
  );
}
