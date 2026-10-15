import BuyerOrders from "@/components/dashboard/buyer-orders";
import SellerOrders from "@/components/dashboard/seller-orders";
import { IconReceipt } from "@/components/ui/icons";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui/kit";
import { requireAccount } from "@/lib/guards";
import { listShowsForSeller } from "@/lib/live";
import { getBuyerBags, getBuyerOrders } from "@/lib/profile";
import { getPayPalClientId } from "@/lib/paypal";

export const metadata = { title: "Orders · Live Drop" };
export const dynamic = "force-dynamic";

export default async function OrdersPage(props: PageProps<"/dashboard/orders">) {
  const user = await requireAccount("/dashboard/orders");

  if (user.role === "buyer") {
    return (
      <>
        <PageHeader kicker="Bag & orders" title="Your purchases" description="Pay for what you claimed, undo agent purchases while the window is open, and track what's on its way." />
        <BuyerOrders bags={await getBuyerBags(user.id)} orders={await getBuyerOrders(user.id)} paypalClientId={getPayPalClientId()} />
      </>
    );
  }

  const shows = await listShowsForSeller(user.id);
  const { show } = await props.searchParams;
  const selected = shows.find((s) => s.id === show) ?? shows.find((s) => s.status === "live") ?? shows[0];
  return (
    <>
      <PageHeader kicker="Orders" title="Orders and shipping" description="Pick a show to send invoices, add tracking numbers and issue refunds. Everything goes through PayPal." />
      {selected ? (
        <SellerOrders shows={shows.map((s) => ({ id: s.id, title: s.title, status: s.status }))} selectedId={selected.id} />
      ) : (
        <Card>
          <EmptyState icon={<IconReceipt size={20} />} title="No shows yet" action={<ButtonLink href="/dashboard/shows" size="sm">Create a show</ButtonLink>}>
            Orders appear here once buyers pay in one of your shows.
          </EmptyState>
        </Card>
      )}
    </>
  );
}
