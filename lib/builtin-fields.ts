// Optional built-in fields a workspace can switch off (Settings → Custom fields).
// Core fields (names, email, company) aren't listed, so they can't be hidden.
// "address" stands for all six address columns together.

import type { CustomEntity } from "@/lib/custom-fields";

export type BuiltinField = { key: string; label: string };

const PERSON: BuiltinField[] = [
  { key: "job_title", label: "Job title" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "source_detail", label: "Source detail" },
  { key: "mobile_phone", label: "Mobile phone" },
  { key: "secondary_email", label: "Second email" },
  { key: "website", label: "Website" },
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "x_url", label: "X (Twitter)" },
  { key: "address", label: "Mailing address" },
];

export const BUILTIN_FIELDS: Partial<Record<CustomEntity, BuiltinField[]>> = {
  lead: PERSON,
  contact: [{ key: "phone", label: "Phone" }, ...PERSON],
  company: [
    { key: "domain", label: "Website" },
    { key: "industry", label: "Industry" },
    { key: "size", label: "Employees" },
    { key: "company_type", label: "Type" },
    { key: "annual_revenue", label: "Annual revenue" },
    { key: "phone", label: "Phone" },
    { key: "linkedin_url", label: "LinkedIn page" },
    { key: "facebook_url", label: "Facebook" },
    { key: "instagram_url", label: "Instagram" },
    { key: "x_url", label: "X (Twitter)" },
    { key: "address", label: "Address" },
  ],
};

export const ADDRESS_FIELDS = ["address_line1", "address_line2", "city", "region", "postal_code", "country"] as const;

// True when a form input should be hidden; address columns follow the "address" switch.
export function isHidden(hidden: string[], field: string) {
  return hidden.includes(field) || ((ADDRESS_FIELDS as readonly string[]).includes(field) && hidden.includes("address"));
}
