import { initialProfile } from "@/lib/profile-values";
import ProfileForm from "@/components/dashboard/profile-form";
import ShopInfoForm from "@/components/dashboard/shop-info-form";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/kit";
import { requireAccount } from "@/lib/guards";

export const metadata = { title: "Profile · Live Drop" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAccount("/dashboard/profile");
  const seller = user.role === "seller";

  return (
    <>
      <PageHeader
        kicker="Profile"
        title={seller ? "Profile and shop" : "Your profile"}
        description={seller ? "How your shop appears to viewers, the defaults for new shows, and what your shop assistant knows." : "How you appear in shows, and what your AI agent should look for."}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-6 min-w-0">
          <ProfileForm role={user.role} initial={initialProfile(user)} />
          {seller && <ShopInfoForm />}
        </div>
        <Card className="lg:sticky lg:top-8">
          <CardHeader title="Account" />
          <dl className="px-5 pb-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="truncate">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Account type</dt>
              <dd className="mt-1">
                <Badge tone="brand">{seller ? "Seller" : "Buyer"}</Badge>
              </dd>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {seller ? "Seller accounts run shows. To shop in other sellers' shows, use a separate buyer account." : "Buyer accounts claim and pay in shows. To sell, create a separate seller account."}
              </p>
            </div>
            <div>
              <dt className="text-xs text-muted">Member since</dt>
              <dd>{new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
