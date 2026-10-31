// Lead types and helpers shared by server and browser code (no database access).

import type { Database } from "@/lib/database.types";

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

// Statuses a person can set by hand. "converted" is only set by convert_lead().
export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
];
export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
};

export const LEAD_SOURCES = ["manual", "website", "referral", "ad", "event", "cold outreach", "other"] as const;

export const LEAD_FIELDS = ["first_name", "last_name", "email", "phone", "job_title", "company_name", "linkedin_url", "source", "status", "notes", "owner_id"] as const;
export type LeadInput = Partial<Record<(typeof LEAD_FIELDS)[number], string>>;

export function leadName(l: Pick<Lead, "first_name" | "last_name" | "email" | "phone">) {
  return [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || l.phone || "Unnamed lead";
}
