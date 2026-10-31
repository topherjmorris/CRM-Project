"use client";

// "Custom fields" part of a record form. Renders one input per definition, named
// "cf:<key>"; the server action reads and validates them with readCustom().
// Renders nothing when the workspace has no custom fields for this record type.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomFieldDef } from "@/lib/custom-fields";

type Props = { defs: CustomFieldDef[]; values: Record<string, string> };

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function CustomFieldsSection({ defs, values }: Props) {
  if (!defs.length) return null;
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border px-4 py-3 pb-4">
      <legend className="px-1 text-sm font-medium">Custom fields</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {defs.map((d) => {
          const id = `cf-${d.key}`;
          const name = `cf:${d.key}`;
          const v = values[d.key] ?? "";
          if (d.type === "checkbox") {
            return (
              <label key={d.id} htmlFor={id} className="flex items-center gap-2 self-end pb-1.5 text-sm font-medium">
                <input id={id} name={name} type="checkbox" defaultChecked={v === "on"} className="size-4 accent-primary" />
                {d.label}
              </label>
            );
          }
          return (
            <div key={d.id} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>{d.label}</Label>
              {d.type === "select" ? (
                <select id={id} name={name} defaultValue={v} className={selectClass}>
                  <option value="">Not set</option>
                  {d.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  name={name}
                  defaultValue={v}
                  type={d.type === "date" ? "date" : "text"}
                  inputMode={d.type === "number" ? "decimal" : undefined}
                  placeholder={d.type === "url" ? "example.com/…" : undefined}
                  maxLength={2000}
                />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
