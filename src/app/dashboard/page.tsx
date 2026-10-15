import BuyerOverview from "@/components/dashboard/buyer-overview";
import SellerOverview from "@/components/dashboard/seller-overview";
import { requireAccount } from "@/lib/guards";

export const metadata = { title: "Overview · Live Drop" };
export const dynamic = "force-dynamic";

// One dashboard URL for everyone: sellers and buyers each get their own overview.
export default async function DashboardPage() {
  const user = await requireAccount("/dashboard");
  return user.role === "seller" ? <SellerOverview user={user} /> : <BuyerOverview user={user} />;
}
