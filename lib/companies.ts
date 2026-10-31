// Company types, the employee-size options, and website normalization.

import type { Database } from "@/lib/database.types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const COMPANY_FIELDS = ["name", "domain", "industry", "size", "phone", "notes", "owner_id"] as const;
export type CompanyInput = Partial<Record<(typeof COMPANY_FIELDS)[number], string>>;

// "https://www.Acme.com/about" -> "acme.com"
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}
