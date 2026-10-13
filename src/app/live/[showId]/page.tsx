import { notFound } from "next/navigation";
import { getShow } from "@/lib/live";
import { getPayPalClientId } from "@/lib/paypal";
import LiveRoom from "./live-room";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/live/[showId]">) {
  const { showId } = await props.params;
  const show = getShow(showId);
  return { title: show ? `${show.title} · Live Drop` : "Live Drop" };
}

export default async function LivePage(props: PageProps<"/live/[showId]">) {
  const { showId } = await props.params;
  const show = getShow(showId);
  if (!show) notFound();
  return <LiveRoom showId={showId} paypalClientId={getPayPalClientId()} />;
}
