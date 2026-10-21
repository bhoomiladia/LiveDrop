"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/kit";
import { DEMO } from "@/lib/demo-script";
import type { ProfileValues } from "@/lib/profile-values";

export type { ProfileValues };

type Props = { values: ProfileValues; onChange: (v: ProfileValues) => void };

// Who you are. Sellers: shop name and bio. Buyers: display name and a short note.
export function IdentityFields({ role, values, onChange }: Props & { role: "seller" | "buyer" }) {
  const set = (k: keyof ProfileValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange({ ...values, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <Field label={role === "seller" ? "Your name" : "Display name"} hint={role === "buyer" ? "Sellers and other viewers see this when you claim an item." : undefined}>
        <Input value={values.name} onChange={set("name")} required minLength={2} maxLength={60} autoComplete="name" demo={DEMO[role].name} />
      </Field>
      {role === "seller" && (
        <Field label="Shop name" hint="Shown to viewers on your shows.">
          <Input value={values.shop_name} onChange={set("shop_name")} required maxLength={60} placeholder="Rosa's Vintage" demo={DEMO.seller.shopName} />
        </Field>
      )}
      <Field label={role === "seller" ? "About your shop" : "About you"} hint="Optional. A sentence or two.">
        <Textarea
          value={values.bio}
          onChange={set("bio")}
          rows={3}
          maxLength={280}
          placeholder={role === "seller" ? "Hand-picked 70s to 90s denim and outerwear, cleaned and checked." : "Collector of vintage denim and odd hats."}
          demo={DEMO[role].bio}
        />
      </Field>
    </div>
  );
}

// Sellers: defaults every new show starts with.
export function ShowDefaultFields({ values, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Shipping per show (USD)" hint="Charged once per buyer per show, however much they buy.">
        <Input value={values.shipping_usd} onChange={(e) => onChange({ ...values, shipping_usd: e.target.value })} inputMode="decimal" />
      </Field>
      <Field label="Time to pay" hint="Unpaid claims pass to the next person in line after this.">
        <Select value={values.claim_minutes} onChange={(e) => onChange({ ...values, claim_minutes: e.target.value })}>
          {[1, 2, 3, 5, 10, 15, 30].map((m) => (
            <option key={m} value={m}>
              {m} minute{m === 1 ? "" : "s"}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

// Buyers: what they shop for. Pre-fills their AI agent.
export function PreferenceFields({ values, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Your sizes" hint="Comma separated, e.g. M, L, 8. Leave empty for any size.">
        <Input value={values.sizes} onChange={(e) => onChange({ ...values, sizes: e.target.value })} maxLength={60} placeholder="M, L" />
      </Field>
      <Field label="What you love" hint="Your AI agent starts from this when you set it up.">
        <Textarea
          value={values.interests}
          onChange={(e) => onChange({ ...values, interests: e.target.value })}
          rows={3}
          maxLength={200}
          placeholder="Vintage denim jackets, wool cardigans, statement boots"
          demo={DEMO.buyer.interests}
        />
      </Field>
    </div>
  );
}
