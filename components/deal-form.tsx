// Deal create/edit form; same pattern as contact-form.tsx. Stages are grouped by pipeline.

"use client";

import { useActionState } from "react";
import { CustomFieldsSection } from "@/components/custom-fields-section";
import { TagInput } from "@/components/tag-input";
import type { TagLite } from "@/lib/tags";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Member } from "@/lib/contacts";
import type { PipelineWithStages } from "@/lib/pipelines";
import type { DealFormState, DealInput } from "@/app/w/[slug]/deals/actions";

type Props = {
  action: (prev: DealFormState, formData: FormData) => Promise<DealFormState>;
  initial: DealInput;
  pipelines: PipelineWithStages[];
  members: Member[];
  companies: string[];
  contacts?: { id: string; label: string }[];
  // Workspace custom fields for this record type, and their current values as strings.
  // Workspace tags (for suggestions) and this record's tag names.
  allTags?: TagLite[];
  tagNames?: string[];
  customDefs?: CustomFieldDef[];
  customValues?: Record<string, string>;
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

export function DealForm({ action, initial, pipelines, members, companies, contacts, submitLabel, savedMessage, customDefs = [], customValues = {}, allTags = [], tagNames = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const saved = savedMessage && !pending && !state.error && state.values !== initial;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="name" label="Deal name" required>
            <Input id="name" name="name" required defaultValue={v.name} maxLength={200} placeholder="Acme – annual plan" autoComplete="off" />
          </Field>
        </div>
        <Field id="value" label="Value (USD)">
          <Input id="value" name="value" inputMode="decimal" defaultValue={v.value} placeholder="0" />
        </Field>
        <Field id="close_date" label="Expected close">
          <Input id="close_date" name="close_date" type="date" defaultValue={v.close_date} />
        </Field>
        <Field id="stage_id" label="Stage" required>
          <select id="stage_id" name="stage_id" required defaultValue={v.stage_id} className={selectClass}>
            {pipelines.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field id="company_name" label="Company">
          <Input id="company_name" name="company_name" defaultValue={v.company_name} list="deal-company-options" autoComplete="off" />
          <datalist id="deal-company-options">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field id="owner_id" label="Owner">
          <select id="owner_id" name="owner_id" defaultValue={v.owner_id ?? ""} className={selectClass}>
            <option value="">No owner</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        {contacts && (
          <Field id="contact_id" label="Contact">
            <select id="contact_id" name="contact_id" defaultValue="" className={selectClass}>
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <TagInput all={allTags} initial={tagNames} />
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
