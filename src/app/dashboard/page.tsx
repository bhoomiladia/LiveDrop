import { redirect } from "next/navigation";

// Sellers live in the studio; the old dashboard URL keeps working for sign-in redirects.
export default function DashboardPage() {
  redirect("/studio");
}
