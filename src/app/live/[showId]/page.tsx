import { notFound } from "next/navigation";
import { ensureDemo, isDemoShow } from "@/lib/demo";
import { getShow } from "@/lib/live";
import { getPayPalClientId } from "@/lib/paypal";
import LiveRoom from "./live-room";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/live/[showId]">) {
  const { showId } = await props.params;
  const show = await getShow(showId);
  return { title: show ? `${show.title} · Live Drop` : "Live Drop" };
}

export default async function LivePage(props: PageProps<"/live/[showId]">) {
  const { showId } = await props.params;
  const show = await getShow(showId);
  if (!show) notFound();
  if (await isDemoShow(showId)) await ensureDemo(); // judge mode: make sure the demo director is running
  return <LiveRoom showId={showId} paypalClientId={getPayPalClientId()} />;
}
