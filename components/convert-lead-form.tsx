"use client";

// Convert-a-lead form. Pre-filled from the lead; the contact needs first name,
// last name, email and company (same rule as adding a contact by hand). Ticking
// "Also create a deal" reveals deal name, value and stage.

import { useActionState, useState } from "react";
import type { ConvertState } from "@/app/w/[slug]/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PipelineWithStages } from "@/lib/pipelines";

type Props = {
  action: (prev: ConvertState, formData: FormData) => Promise<ConvertState>;
  initial: Record<string, string>;
  companies: string[];
  pipelines: PipelineWithStages[];
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

export function ConvertLeadForm({ action, initial, companies, pipelines }: Props) {
  const [state, formAction, pending] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const [withDeal, setWithDeal] = useState(v.create_deal === "on");
  const openStages = pipelines.flatMap((p) => p.stages.filter((s) => s.kind === "open").map((s) => ({ ...s, pipeline: p.name })));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-medium">New contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="first_name" label="First name" required>
            <Input id="first_name" name="first_name" required defaultValue={v.first_name} maxLength={100} />
          </Field>
          <Field id="last_name" label="Last name" required>
            <Input id="last_name" name="last_name" required defaultValue={v.last_name} maxLength={100} />
          </Field>
          <Field id="email" label="Email" required>
            <Input id="email" name="email" type="email" required defaultValue={v.email} />
          </Field>
          <Field id="phone" label="Phone">
            <Input id="phone" name="phone" type="tel" defaultValue={v.phone} maxLength={40} />
          </Field>
          <Field id="company_name" label="Company" required>
            <Input id="company_name" name="company_name" required defaultValue={v.company_name} maxLength={200} list="convert-company-options" autoComplete="off" />
            <datalist id="convert-company-options">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="job_title" label="Job title">
            <Input id="job_title" name="job_title" defaultValue={v.job_title} maxLength={120} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          If a contact with this email already exists, the lead is linked to that contact instead of creating a duplicate.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="sr-only">Deal</legend>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="create_deal" checked={withDeal} onChange={(e) => setWithDeal(e.target.checked)} className="size-4 accent-primary" />
          Also create a deal
        </label>
        {withDeal && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="deal_name" label="Deal name" required>
                <Input id="deal_name" name="deal_name" required defaultValue={v.deal_name} maxLength={200} />
              </Field>
            </div>
            <Field id="deal_value" label="Value (USD)">
              <Input id="deal_value" name="deal_value" inputMode="decimal" defaultValue={v.deal_value} placeholder="0" />
            </Field>
            <Field id="stage_id" label="Stage" required>
              <select id="stage_id" name="stage_id" required defaultValue={v.stage_id || openStages[0]?.id} className={selectClass}>
                {openStages.map((s) => (
                  <option key={s.id} value={s.id}>{pipelines.length > 1 ? `${s.pipeline} · ${s.name}` : s.name}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </fieldset>

      <div>
        <Button type="submit" disabled={pending}>{pending ? "Converting…" : "Convert to contact"}</Button>
      </div>
    </form>
  );
}
