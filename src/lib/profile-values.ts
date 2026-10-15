// Profile form values, shared by server pages (initial values) and the client forms.
export type ProfileValues = {
  name: string;
  bio: string;
  shop_name: string;
  shipping_usd: string;
  claim_minutes: string;
  sizes: string;
  interests: string;
};

export function initialProfile(u: {
  name: string;
  bio: string | null;
  shop_name: string | null;
  default_shipping_cents: number | null;
  default_claim_minutes: number | null;
  sizes: string | null;
  interests: string | null;
}): ProfileValues {
  return {
    name: u.name,
    bio: u.bio ?? "",
    shop_name: u.shop_name ?? "",
    shipping_usd: String((u.default_shipping_cents ?? 700) / 100),
    claim_minutes: String(u.default_claim_minutes ?? 5),
    sizes: u.sizes ?? "",
    interests: u.interests ?? "",
  };
}
