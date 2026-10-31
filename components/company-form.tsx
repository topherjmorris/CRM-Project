// Company create/edit form; same pattern as contact-form.tsx.

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_SIZES, type CompanyInput } from "@/lib/companies";
import type { Member } from "@/lib/contacts";
import type { CompanyFormState } from "@/app/w/[slug]/companies/actions";

type Props = {
  action: (prev: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  initial: CompanyInput;
  members: Member[];
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

export function CompanyForm({ action, initial, members, submitLabel, savedMessage }: Props) {
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
        <Field id="domain" label="Website">
          <Input id="domain" name="domain" defaultValue={v.domain} placeholder="acme.com" autoComplete="off" />
        </Field>
        <Field id="industry" label="Industry">
          <Input id="industry" name="industry" defaultValue={v.industry} maxLength={120} placeholder="Plumbing, dental, retail…" />
        </Field>
        <Field id="size" label="Employees">
          <select id="size" name="size" defaultValue={v.size ?? ""} className={selectClass}>
            <option value="">Unknown</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field id="phone" label="Phone">
          <Input id="phone" name="phone" type="tel" defaultValue={v.phone} maxLength={40} />
        </Field>
        <Field id="owner_id" label="Owner">
          <select id="owner_id" name="owner_id" defaultValue={v.owner_id ?? ""} className={selectClass}>
            <option value="">No owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
      </div>
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
