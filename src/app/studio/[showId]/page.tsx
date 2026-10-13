import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getShow } from "@/lib/live";
import StudioRoom from "./studio-room";

export const metadata = { title: "Studio · Live Drop" };
export const dynamic = "force-dynamic";

export default async function StudioPage(props: PageProps<"/studio/[showId]">) {
  const { showId } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/studio/${showId}`);
  const show = getShow(showId);
  if (!show || show.seller_id !== user.id) notFound();
  return <StudioRoom showId={showId} />;
}
