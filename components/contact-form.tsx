"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContactInput, Member } from "@/lib/contacts";
import type { FormState } from "@/app/w/[slug]/contacts/actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: ContactInput;
  members: Member[];
  submitLabel: string;
  savedMessage?: string;
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function ContactForm({ action, initial, members, submitLabel, savedMessage }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const saved = savedMessage && !pending && !state.error && state.values !== initial;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="first_name" label="First name">
          <Input id="first_name" name="first_name" defaultValue={v.first_name} maxLength={100} autoComplete="off" />
        </Field>
        <Field id="last_name" label="Last name">
          <Input id="last_name" name="last_name" defaultValue={v.last_name} maxLength={100} autoComplete="off" />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" name="email" type="email" defaultValue={v.email} autoComplete="off" />
        </Field>
        <Field id="phone" label="Phone">
          <Input id="phone" name="phone" type="tel" defaultValue={v.phone} maxLength={40} autoComplete="off" />
        </Field>
        <Field id="job_title" label="Job title">
          <Input id="job_title" name="job_title" defaultValue={v.job_title} maxLength={120} />
        </Field>
        <Field id="company_name" label="Company">
          <Input id="company_name" name="company_name" defaultValue={v.company_name} maxLength={200} />
        </Field>
        <Field id="linkedin_url" label="LinkedIn URL">
          <Input id="linkedin_url" name="linkedin_url" defaultValue={v.linkedin_url} placeholder="linkedin.com/in/…" />
        </Field>
        <Field id="owner_id" label="Owner">
          <select
            id="owner_id"
            name="owner_id"
            defaultValue={v.owner_id ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
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
