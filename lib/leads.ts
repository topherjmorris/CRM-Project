// Lead types and helpers shared by server and browser code (no database access).

import type { Database } from "@/lib/database.types";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadStage = Database["public"]["Tables"]["lead_stages"]["Row"];
export type LeadStageKind = Database["public"]["Enums"]["lead_stage_kind"];

export const STAGE_KIND_LABEL: Record<LeadStageKind, string> = {
  open: "Open",
  unqualified: "Unqualified",
  converted: "Converted",
};

export const LEAD_SOURCES = ["manual", "website", "referral", "ad", "event", "cold outreach", "other"] as const;
export const sourceLabel = (s: string) => (s === "manual" ? "Added by hand" : s[0].toUpperCase() + s.slice(1));

export const LEAD_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "company_name",
  "linkedin_url",
  "source",
  "stage_id",
  "notes",
  "owner_id",
] as const;
export type LeadInput = Partial<Record<(typeof LEAD_FIELDS)[number] | DetailField, string>>;

export function leadName(l: Pick<Lead, "first_name" | "last_name" | "email" | "phone">) {
  return [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || l.phone || "Unnamed lead";
}

// Extra detail shared by leads and contacts (copied across on conversion).
export const DETAIL_FIELDS = [
  "source_detail",
  "mobile_phone",
  "secondary_email",
  "website",
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
export type DetailField = (typeof DETAIL_FIELDS)[number];
const URL_FIELDS: DetailField[] = ["website", "facebook_url", "instagram_url", "x_url"];

// Form values -> database columns: blanks become null, URLs get https:// if missing.
export function detailRow(v: Partial<Record<DetailField, string>>) {
  const row = {} as Record<DetailField, string | null>;
  for (const f of DETAIL_FIELDS) {
    let val = v[f]?.trim() || null;
    if (val && URL_FIELDS.includes(f) && !/^https?:\/\//i.test(val)) val = `https://${val}`;
    if (val && f === "secondary_email") val = val.toLowerCase();
    row[f] = val;
  }
  return row;
}

// Database row -> form values.
export function detailInput(r: Partial<Record<DetailField, string | null>>) {
  const v: Partial<Record<DetailField, string>> = {};
  for (const f of DETAIL_FIELDS) v[f] = r[f] ?? "";
  return v;
}

export function readDetail(formData: FormData) {
  const v: Partial<Record<DetailField, string>> = {};
  for (const f of DETAIL_FIELDS) v[f] = String(formData.get(f) ?? "").trim();
  return v;
}

// Turns a database check-constraint error on these fields into plain language.
export function detailError(message: string): string | null {
  if (message.includes("secondary_email_check")) return "The second email doesn't look right.";
  if (/(website|facebook_url|instagram_url|x_url)_check/.test(message)) return "One of the web links doesn't look right.";
  return null;
}
