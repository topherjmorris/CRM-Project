// Company create/edit form; same pattern as contact-form.tsx.

"use client";

import { useActionState } from "react";
import { CustomFieldsSection } from "@/components/custom-fields-section";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { ADDRESS_FIELDS, isHidden } from "@/lib/builtin-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_EXTRA_FIELDS, COMPANY_SIZES, COMPANY_TYPES, REVENUE_RANGES, type CompanyInput } from "@/lib/companies";
import type { Member } from "@/lib/contacts";
import type { CompanyFormState } from "@/app/w/[slug]/companies/actions";

type Props = {
  action: (prev: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  initial: CompanyInput;
  members: Member[];
  // Workspace custom fields for this record type, and their current values as strings.
  customDefs?: CustomFieldDef[];
  customValues?: Record<string, string>;
  // Built-in fields this workspace has switched off (Settings → Custom fields).
  hidden?: string[];
  submitLabel: string;
  savedMessage?: string;
};

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function CompanyForm({ action, initial, members, submitLabel, savedMessage, customDefs = [], customValues = {}, hidden = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const saved = savedMessage && !pending && !state.error && state.values !== initial;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Company name" required>
          <Input id="name" name="name" required defaultValue={v.name} maxLength={200} autoComplete="off" />
        </Field>
        {isHidden(hidden, "domain") ? (
          <input type="hidden" name="domain" value={v.domain ?? ""} />
        ) : (
          <Field id="domain" label="Website">
          <Input id="domain" name="domain" defaultValue={v.domain} placeholder="acme.com" autoComplete="off" />
        </Field>
        )}
        {isHidden(hidden, "industry") ? (
          <input type="hidden" name="industry" value={v.industry ?? ""} />
        ) : (
          <Field id="industry" label="Industry">
          <Input id="industry" name="industry" defaultValue={v.industry} maxLength={120} placeholder="Plumbing, dental, retail…" />
        </Field>
        )}
        {isHidden(hidden, "size") ? (
          <input type="hidden" name="size" value={v.size ?? ""} />
        ) : (
          <Field id="size" label="Employees">
          <select id="size" name="size" defaultValue={v.size ?? ""} className={selectClass}>
            <option value="">Unknown</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        )}
        {isHidden(hidden, "company_type") ? (
          <input type="hidden" name="company_type" value={v.company_type ?? ""} />
        ) : (
          <Field id="company_type" label="Type">
          <select id="company_type" name="company_type" defaultValue={v.company_type ?? ""} className={selectClass}>
            <option value="">Not set</option>
            {COMPANY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        )}
        {isHidden(hidden, "annual_revenue") ? (
          <input type="hidden" name="annual_revenue" value={v.annual_revenue ?? ""} />
        ) : (
          <Field id="annual_revenue" label="Annual revenue">
          <select id="annual_revenue" name="annual_revenue" defaultValue={v.annual_revenue ?? ""} className={selectClass}>
            <option value="">Unknown</option>
            {REVENUE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
        )}
        {isHidden(hidden, "phone") ? (
          <input type="hidden" name="phone" value={v.phone ?? ""} />
        ) : (
          <Field id="phone" label="Phone">
          <Input id="phone" name="phone" type="tel" defaultValue={v.phone} maxLength={40} />
        </Field>
        )}
        <Field id="owner_id" label="Owner">
          <select id="owner_id" name="owner_id" defaultValue={v.owner_id ?? ""} className={selectClass}>
            <option value="">No owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
      </div>
      {/* Social links and address, collapsed unless any are filled in. */}
      <details
        hidden={["linkedin_url", "facebook_url", "instagram_url", "x_url", "address"].every((f) => hidden.includes(f))}
        open={COMPANY_EXTRA_FIELDS.some((f) => v[f])} className="rounded-lg border px-4 py-3 open:pb-4">
        <summary className="cursor-pointer text-sm font-medium select-none">More details: social links, address</summary>
        <div className="mt-4 flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {isHidden(hidden, "linkedin_url") ? (
              <input type="hidden" name="linkedin_url" value={v.linkedin_url ?? ""} />
            ) : (
              <Field id="linkedin_url" label="LinkedIn page"><Input id="linkedin_url" name="linkedin_url" defaultValue={v.linkedin_url} placeholder="linkedin.com/company/…" /></Field>
            )}
            {isHidden(hidden, "facebook_url") ? (
              <input type="hidden" name="facebook_url" value={v.facebook_url ?? ""} />
            ) : (
              <Field id="facebook_url" label="Facebook"><Input id="facebook_url" name="facebook_url" defaultValue={v.facebook_url} placeholder="facebook.com/…" /></Field>
            )}
            {isHidden(hidden, "instagram_url") ? (
              <input type="hidden" name="instagram_url" value={v.instagram_url ?? ""} />
            ) : (
              <Field id="instagram_url" label="Instagram"><Input id="instagram_url" name="instagram_url" defaultValue={v.instagram_url} placeholder="instagram.com/…" /></Field>
            )}
            {isHidden(hidden, "x_url") ? (
              <input type="hidden" name="x_url" value={v.x_url ?? ""} />
            ) : (
              <Field id="x_url" label="X (Twitter)"><Input id="x_url" name="x_url" defaultValue={v.x_url} placeholder="x.com/…" /></Field>
            )}
          </div>
          {isHidden(hidden, "address") ? (
            ADDRESS_FIELDS.map((f) => <input key={f} type="hidden" name={f} value={v[f] ?? ""} />)
          ) : (
            <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">Address</legend>
            <div className="sm:col-span-2"><Field id="address_line1" label="Street address"><Input id="address_line1" name="address_line1" defaultValue={v.address_line1} maxLength={200} /></Field></div>
            <div className="sm:col-span-2"><Field id="address_line2" label="Suite, floor, etc."><Input id="address_line2" name="address_line2" defaultValue={v.address_line2} maxLength={200} /></Field></div>
            <Field id="city" label="City"><Input id="city" name="city" defaultValue={v.city} maxLength={100} /></Field>
            <Field id="region" label="State / region"><Input id="region" name="region" defaultValue={v.region} maxLength={100} /></Field>
            <Field id="postal_code" label="Postal code"><Input id="postal_code" name="postal_code" defaultValue={v.postal_code} maxLength={20} /></Field>
            <Field id="country" label="Country"><Input id="country" name="country" defaultValue={v.country} maxLength={100} /></Field>
          </fieldset>
          )}
        </div>
      </details>
      <CustomFieldsSection defs={customDefs} values={state.custom ?? customValues} />
      <Field id="notes" label="Notes">
        <Textarea id="notes" name="notes" defaultValue={v.notes} rows={4} maxLength={10000} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {saved && <span className="text-sm text-muted-foreground" role="status">{savedMessage}</span>}
      </div>
    </form>
  );
}
