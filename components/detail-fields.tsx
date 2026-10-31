"use client";

// The extra-detail section shared by lead and contact forms: source detail,
// secondary contact info, social links and mailing address. Collapsed by
// default so the main form stays short; opens when any of these are filled in.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DetailField } from "@/lib/leads";

type Props = { values: Partial<Record<DetailField, string>> };

function F({ id, label, v, ...rest }: { id: DetailField; label: string; v: Props["values"] } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} defaultValue={v[id]} {...rest} />
    </div>
  );
}

export function DetailFields({ values: v }: Props) {
  const filled = Object.values(v).some(Boolean);
  return (
    <details open={filled} className="group rounded-lg border px-4 py-3 open:pb-4">
      <summary className="cursor-pointer text-sm font-medium select-none">More details: source, other contact info, address</summary>
      <div className="mt-4 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="source_detail" label="Source detail" v={v} maxLength={200} placeholder="Campaign, referrer, event name…" />
          <F id="mobile_phone" label="Mobile phone" v={v} type="tel" maxLength={40} />
          <F id="secondary_email" label="Second email" v={v} type="email" />
          <F id="website" label="Website" v={v} placeholder="example.com" />
          <F id="facebook_url" label="Facebook" v={v} placeholder="facebook.com/…" />
          <F id="instagram_url" label="Instagram" v={v} placeholder="instagram.com/…" />
          <F id="x_url" label="X (Twitter)" v={v} placeholder="x.com/…" />
        </div>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">Mailing address</legend>
          <div className="sm:col-span-2"><F id="address_line1" label="Street address" v={v} maxLength={200} /></div>
          <div className="sm:col-span-2"><F id="address_line2" label="Apt, suite, etc." v={v} maxLength={200} /></div>
          <F id="city" label="City" v={v} maxLength={100} />
          <F id="region" label="State / region" v={v} maxLength={100} />
          <F id="postal_code" label="Postal code" v={v} maxLength={20} />
          <F id="country" label="Country" v={v} maxLength={100} />
        </fieldset>
      </div>
    </details>
  );
}
