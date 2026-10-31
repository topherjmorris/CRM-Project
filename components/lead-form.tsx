"use client";

// Lead create/edit form. Same pattern as contact-form.tsx: useActionState keeps
// what was typed when the server returns an error.

import { useActionState } from "react";
import { CustomFieldsSection } from "@/components/custom-fields-section";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { isHidden } from "@/lib/builtin-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LeadFormState } from "@/app/w/[slug]/leads/actions";
import type { Member } from "@/lib/contacts";
import { DetailFields } from "@/components/detail-fields";
import { DETAIL_FIELDS, LEAD_SOURCES, sourceLabel, type LeadInput, type LeadStage } from "@/lib/leads";

type Props = {
  action: (prev: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  initial: LeadInput;
  members: Member[];
  // Stages a person can pick: open and unqualified (Converted is set by Convert).
  stages: LeadStage[];
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

export function LeadForm({ action, initial, members, stages, submitLabel, savedMessage, customDefs = [], customValues = {}, hidden = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const saved = savedMessage && !pending && !state.error && state.values !== initial;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="first_name" label="First name" required>
          <Input id="first_name" name="first_name" required defaultValue={v.first_name} maxLength={100} autoComplete="off" />
        </Field>
        <Field id="last_name" label="Last name" required>
          <Input id="last_name" name="last_name" required defaultValue={v.last_name} maxLength={100} autoComplete="off" />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" name="email" type="email" defaultValue={v.email} autoComplete="off" />
        </Field>
        <Field id="phone" label="Phone">
          <Input id="phone" name="phone" type="tel" defaultValue={v.phone} maxLength={40} autoComplete="off" />
        </Field>
        <Field id="company_name" label="Company">
          <Input id="company_name" name="company_name" defaultValue={v.company_name} maxLength={200} />
        </Field>
        {isHidden(hidden, "job_title") ? (
          <input type="hidden" name="job_title" value={v.job_title ?? ""} />
        ) : (
          <Field id="job_title" label="Job title">
          <Input id="job_title" name="job_title" defaultValue={v.job_title} maxLength={120} />
        </Field>
        )}
        <Field id="stage_id" label="Stage">
          <select id="stage_id" name="stage_id" defaultValue={v.stage_id || stages[0]?.id} className={selectClass}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field id="source" label="Source">
          <select id="source" name="source" defaultValue={v.source || "manual"} className={selectClass}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>{sourceLabel(s)}</option>
            ))}
          </select>
        </Field>
        {isHidden(hidden, "linkedin_url") ? (
          <input type="hidden" name="linkedin_url" value={v.linkedin_url ?? ""} />
        ) : (
          <Field id="linkedin_url" label="LinkedIn URL">
          <Input id="linkedin_url" name="linkedin_url" defaultValue={v.linkedin_url} placeholder="linkedin.com/in/…" />
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
      <p className="-mt-2 text-xs text-muted-foreground">An email or a phone number is required.</p>
      <DetailFields hidden={hidden} values={Object.fromEntries(DETAIL_FIELDS.map((f) => [f, v[f] ?? ""]))} />
      <CustomFieldsSection defs={customDefs} values={state.custom ?? customValues} />
      <Field id="notes" label="Notes">
        <Textarea id="notes" name="notes" defaultValue={v.notes} rows={3} maxLength={10000} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
        {saved && <span className="text-sm text-muted-foreground" role="status">{savedMessage}</span>}
      </div>
    </form>
  );
}
