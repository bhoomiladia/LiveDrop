import { redirect } from "next/navigation";

// The show list moved into the dashboard; old /studio links keep working.
export default function StudioHome() {
  redirect("/dashboard/shows");
}
