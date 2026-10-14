import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getControlData } from "@/lib/control-data";
import { getShow } from "@/lib/live";
import ControlRoom from "@/components/control/control-room";

export const metadata = { title: "Control room · Live Drop" };
export const dynamic = "force-dynamic";

// The seller's AG Studio control room: dashboards over all their shows + the Show Producer agent.
export default async function ControlPage(props: PageProps<"/studio/[showId]/control">) {
  const { showId } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/studio/${showId}/control`);
  const show = getShow(showId);
  if (!show || show.seller_id !== user.id) notFound();
  return (
    <ControlRoom
      showId={showId}
      showTitle={show.title}
      data={getControlData(user.id)}
      licenseKey={process.env.AG_STUDIO_LICENSE_KEY || undefined}
      aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
    />
  );
}
