// Custom fields: types and helpers shared by server and browser code.
// Definitions live in the custom_fields table; values live in each record's
// `custom` jsonb column keyed by the definition's `key`. Form inputs are named
// "cf:<key>" so they can't clash with built-in field names.

import type { Database } from "@/lib/database.types";

export type CustomFieldDef = Database["public"]["Tables"]["custom_fields"]["Row"];
export type CustomEntity = Database["public"]["Enums"]["custom_entity"];
export type CustomFieldType = Database["public"]["Enums"]["custom_field_type"];
export type CustomValues = Record<string, string | number | boolean>;

export const ENTITIES: { value: CustomEntity; label: string }[] = [
  { value: "lead", label: "Leads" },
  { value: "contact", label: "Contacts" },
  { value: "company", label: "Companies" },
  { value: "deal", label: "Deals" },
];

export const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "Link" },
];

// "Contract Renewal Date" -> "contract_renewal_date"
export function keyFromLabel(label: string) {
  const k = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return /^[a-z]/.test(k) ? k : `f_${k}`.slice(0, 50);
}

// Stored values -> strings for form inputs (checkbox: "on" or "").
export function customToInputs(defs: CustomFieldDef[], stored: unknown): Record<string, string> {
  const s = (stored ?? {}) as CustomValues;
  const out: Record<string, string> = {};
  for (const d of defs) {
    const v = s[d.key];
    out[d.key] = v === undefined || v === null ? "" : d.type === "checkbox" ? (v ? "on" : "") : String(v);
  }
  return out;
}

// Reads "cf:<key>" inputs, checks each against its definition and returns the
// values to store. Empty fields are removed from the record. `raw` is what was
// typed, so a form can show it again after an error.
export function readCustom(formData: FormData, defs: CustomFieldDef[], existing: unknown = {}) {
  const raw: Record<string, string> = {};
  const values: CustomValues = { ...((existing ?? {}) as CustomValues) };
  for (const d of defs) {
    const input = String(formData.get(`cf:${d.key}`) ?? "").trim();
    raw[d.key] = input;
    delete values[d.key];
    if (d.type === "checkbox") {
      if (input === "on") values[d.key] = true;
      continue;
    }
    if (!input) continue;
    switch (d.type) {
      case "number": {
        const n = Number(input.replace(/[,\s$]/g, ""));
        if (!Number.isFinite(n)) return { raw, error: `${d.label} must be a number.` };
        values[d.key] = n;
        break;
      }
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return { raw, error: `${d.label} must be a date.` };
        values[d.key] = input;
        break;
      case "select":
        if (!d.options.includes(input)) return { raw, error: `Pick one of the options for ${d.label}.` };
        values[d.key] = input;
        break;
      case "url": {
        const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
        try {
          new URL(url);
        } catch {
          return { raw, error: `${d.label} must be a web link.` };
        }
        values[d.key] = url;
        break;
      }
      default:
        values[d.key] = input.slice(0, 2000);
    }
  }
  return { raw, values };
}

// For timeline entries: "custom.budget" -> "Budget" using the workspace's definitions
// when available, otherwise a readable version of the key.
export function customFieldLabel(field: string, defs?: Pick<CustomFieldDef, "key" | "label">[]) {
  const key = field.replace(/^custom\./, "");
  return defs?.find((d) => d.key === key)?.label ?? key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
