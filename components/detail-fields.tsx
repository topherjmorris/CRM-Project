"use client";

// The extra-detail section shared by lead and contact forms: source detail,
// secondary contact info, social links and mailing address. Collapsed by
// default so the main form stays short; opens when any of these are filled in.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADDRESS_FIELDS, isHidden } from "@/lib/builtin-fields";
import type { DetailField } from "@/lib/leads";

// `hidden`: built-in fields switched off for this workspace. They still submit
// their current value (as hidden inputs) so saving never erases them.
type Props = { values: Partial<Record<DetailField, string>>; hidden?: string[] };

function F({ id, label, v, off = [], ...rest }: { id: DetailField; label: string; v: Props["values"]; off?: string[] } & React.ComponentProps<typeof Input>) {
  if (isHidden(off, id)) return <input type="hidden" name={id} value={v[id] ?? ""} />;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} defaultValue={v[id]} {...rest} />
    </div>
  );
}

export function DetailFields({ values: v, hidden = [] }: Props) {
  const filled = Object.values(v).some(Boolean);
  const visible = ["source_detail", "mobile_phone", "secondary_email", "website", "facebook_url", "instagram_url", "x_url", "address"].some((f) => !hidden.includes(f));
  return (
    <details hidden={!visible} open={filled} className="group rounded-lg border px-4 py-3 open:pb-4">
      <summary className="cursor-pointer text-sm font-medium select-none">More details</summary>
      <div className="mt-4 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <F off={hidden} id="source_detail" label="Source detail" v={v} maxLength={200} placeholder="Campaign, referrer, event name…" />
          <F off={hidden} id="mobile_phone" label="Mobile phone" v={v} type="tel" maxLength={40} />
          <F off={hidden} id="secondary_email" label="Second email" v={v} type="email" />
          <F off={hidden} id="website" label="Website" v={v} placeholder="example.com" />
          <F off={hidden} id="facebook_url" label="Facebook" v={v} placeholder="facebook.com/…" />
          <F off={hidden} id="instagram_url" label="Instagram" v={v} placeholder="instagram.com/…" />
          <F off={hidden} id="x_url" label="X (Twitter)" v={v} placeholder="x.com/…" />
        </div>
        {hidden.includes("address") ? (
          ADDRESS_FIELDS.map((f) => <input key={f} type="hidden" name={f} value={v[f] ?? ""} />)
        ) : (
          <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">Mailing address</legend>
          <div className="sm:col-span-2"><F off={hidden} id="address_line1" label="Street address" v={v} maxLength={200} /></div>
          <div className="sm:col-span-2"><F off={hidden} id="address_line2" label="Apt, suite, etc." v={v} maxLength={200} /></div>
          <F off={hidden} id="city" label="City" v={v} maxLength={100} />
          <F off={hidden} id="region" label="State / region" v={v} maxLength={100} />
          <F off={hidden} id="postal_code" label="Postal code" v={v} maxLength={20} />
          <F off={hidden} id="country" label="Country" v={v} maxLength={100} />
        </fieldset>
        )}
      </div>
    </details>
  );
}
