import { redirect } from "next/navigation";

// The control room now lives in the dashboard (Insights); old links keep working.
export default async function ControlPage(props: PageProps<"/studio/[showId]/control">) {
  const { showId } = await props.params;
  redirect(`/dashboard/insights?show=${showId}`);
}
