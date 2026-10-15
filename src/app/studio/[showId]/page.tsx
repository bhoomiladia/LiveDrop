import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guards";
import { getShow } from "@/lib/live";
import StudioRoom from "./studio-room";

export const metadata = { title: "Studio · Live Drop" };
export const dynamic = "force-dynamic";

export default async function StudioPage(props: PageProps<"/studio/[showId]">) {
  const { showId } = await props.params;
  const user = await requireAccount(`/studio/${showId}`, "seller");
  const show = await getShow(showId);
  if (!show || show.seller_id !== user.id) notFound();
  return <StudioRoom showId={showId} />;
}
