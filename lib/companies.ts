// Company types, option lists (size, type, revenue), extra fields and website normalization.

import type { Database } from "@/lib/database.types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const COMPANY_TYPES = [
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "vendor", label: "Vendor" },
  { value: "competitor", label: "Competitor" },
  { value: "other", label: "Other" },
] as const;

export const REVENUE_RANGES = [
  { value: "<1m", label: "Under $1M" },
  { value: "1-5m", label: "$1M–$5M" },
  { value: "5-25m", label: "$5M–$25M" },
  { value: "25-100m", label: "$25M–$100M" },
  { value: "100m+", label: "$100M+" },
] as const;

export const typeLabel = (v: string | null) => COMPANY_TYPES.find((t) => t.value === v)?.label ?? null;
export const revenueLabel = (v: string | null) => REVENUE_RANGES.find((r) => r.value === v)?.label ?? null;

// Social links and mailing address; shown in the "More details" part of the form.
export const COMPANY_EXTRA_FIELDS = [
  "linkedin_url",
  "facebook_url",
  "instagram_url",
  "x_url",
  "address_line1",
  "address_line2",
  "city",
  "region",
  "postal_code",
  "country",
] as const;
const URL_FIELDS = ["linkedin_url", "facebook_url", "instagram_url", "x_url"];

export const COMPANY_FIELDS = [
  "name",
  "domain",
  "industry",
  "size",
  "company_type",
  "annual_revenue",
  "phone",
  "notes",
  "owner_id",
  ...COMPANY_EXTRA_FIELDS,
] as const;
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

// Extra fields from the form -> database columns: blanks become null, links get https://.
export function companyExtraRow(v: CompanyInput) {
  const row = {} as Record<(typeof COMPANY_EXTRA_FIELDS)[number], string | null>;
  for (const f of COMPANY_EXTRA_FIELDS) {
    let val = v[f]?.trim() || null;
    if (val && URL_FIELDS.includes(f) && !/^https?:\/\//i.test(val)) val = `https://${val}`;
    row[f] = val;
  }
  return row;
}
